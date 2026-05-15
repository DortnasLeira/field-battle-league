
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.referee_tier AS ENUM ('bronze','silver','gold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_status AS ENUM ('pending','accepted','declined','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('held','released','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLE: referees ============
CREATE TABLE public.referees (
  referee_id uuid PRIMARY KEY,
  display_name text NOT NULL,
  bio text,
  city text,
  tier public.referee_tier NOT NULL DEFAULT 'bronze',
  certifications text[] NOT NULL DEFAULT '{}',
  experience_years integer NOT NULL DEFAULT 0,
  price_per_game numeric(10,2) NOT NULL DEFAULT 0,
  available_days text[] NOT NULL DEFAULT '{}',
  available_times text[] NOT NULL DEFAULT '{}',
  score numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referees_public_read"
  ON public.referees FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "referees_self_insert"
  ON public.referees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referee_id);

CREATE POLICY "referees_self_update"
  ON public.referees FOR UPDATE
  TO authenticated
  USING (auth.uid() = referee_id)
  WITH CHECK (auth.uid() = referee_id);

CREATE TRIGGER referees_touch_updated_at
  BEFORE UPDATE ON public.referees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Block manual edits to score / reviews_count.
-- Only the recompute trigger may change them (it sets a per-tx GUC).
CREATE OR REPLACE FUNCTION public.referees_protect_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text;
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count THEN
    allowed := current_setting('app.allow_score_update', true);
    IF allowed IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'score e reviews_count são gerenciados pelo sistema e não podem ser alterados manualmente';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referees_protect_score_trg
  BEFORE UPDATE ON public.referees
  FOR EACH ROW EXECUTE FUNCTION public.referees_protect_score();

-- ============ TABLE: match_assignments ============
CREATE TABLE public.match_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id uuid NOT NULL REFERENCES public.referees(referee_id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  requester_team_id uuid,
  requester_profile_type text NOT NULL CHECK (requester_profile_type IN ('team','field')),
  match_id uuid,
  challenge_id uuid,
  scheduled_at timestamptz NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  message text,
  status public.assignment_status NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_assignments_referee_idx ON public.match_assignments(referee_id);
CREATE INDEX match_assignments_requester_idx ON public.match_assignments(requester_user_id);

ALTER TABLE public.match_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_visible_parties"
  ON public.match_assignments FOR SELECT
  TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR referee_id = auth.uid()
    OR (requester_team_id IS NOT NULL AND public.is_team_member(auth.uid(), requester_team_id))
  );

CREATE POLICY "assignments_insert_requester"
  ON public.match_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.type::text = match_assignments.requester_profile_type
    )
  );

-- Both parties can update (e.g. requester cancels, referee accepts/declines/signs)
CREATE POLICY "assignments_update_parties"
  ON public.match_assignments FOR UPDATE
  TO authenticated
  USING (requester_user_id = auth.uid() OR referee_id = auth.uid())
  WITH CHECK (requester_user_id = auth.uid() OR referee_id = auth.uid());

CREATE TRIGGER match_assignments_touch_updated_at
  BEFORE UPDATE ON public.match_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TABLE: referee_reviews ============
CREATE TABLE public.referee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES public.match_assignments(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.referees(referee_id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX referee_reviews_referee_idx ON public.referee_reviews(referee_id);

ALTER TABLE public.referee_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read"
  ON public.referee_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "reviews_insert_after_completion"
  ON public.referee_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.id = assignment_id
        AND ma.requester_user_id = auth.uid()
        AND ma.referee_id = referee_reviews.referee_id
        AND ma.status = 'completed'
        AND ma.signed_at IS NOT NULL
    )
  );
-- No UPDATE / DELETE policies => those actions are denied.

-- ============ TABLE: payouts ============
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES public.match_assignments(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.referees(referee_id) ON DELETE CASCADE,
  payer_user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status public.payout_status NOT NULL DEFAULT 'held',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  held_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payouts_referee_idx ON public.payouts(referee_id);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_visible_parties"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (referee_id = auth.uid() OR payer_user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies => only service role (server) can write.

CREATE TRIGGER payouts_touch_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TRIGGER: recompute score from reviews ============
CREATE OR REPLACE FUNCTION public.recompute_referee_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  avg_score numeric(3,2);
  total integer;
BEGIN
  target := COALESCE(NEW.referee_id, OLD.referee_id);

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
    INTO avg_score, total
  FROM public.referee_reviews
  WHERE referee_id = target;

  -- Authorize the protected update for this transaction only.
  PERFORM set_config('app.allow_score_update', 'on', true);
  UPDATE public.referees
     SET score = avg_score,
         reviews_count = total
   WHERE referee_id = target;
  PERFORM set_config('app.allow_score_update', 'off', true);

  RETURN NULL;
END $$;

CREATE TRIGGER referee_reviews_recompute_score
  AFTER INSERT OR UPDATE OR DELETE ON public.referee_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_referee_score();

-- ============ TRIGGER: release payout when súmula is signed ============
CREATE OR REPLACE FUNCTION public.release_payout_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND NEW.signed_at IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.signed_at IS NULL) THEN
    UPDATE public.payouts
       SET status = 'released',
           released_at = now()
     WHERE assignment_id = NEW.id
       AND status = 'held';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER match_assignments_release_payout
  AFTER UPDATE ON public.match_assignments
  FOR EACH ROW EXECUTE FUNCTION public.release_payout_on_signature();
