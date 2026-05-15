-- 1) Add columns to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric(7,2) NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS fair_play numeric(5,2) NOT NULL DEFAULT 100;

-- 2) Trophies table
CREATE TABLE IF NOT EXISTS public.team_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  season text,
  icon text DEFAULT '🏆',
  awarded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_trophies_team_id_idx ON public.team_trophies(team_id);

ALTER TABLE public.team_trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trophies_select_authenticated"
  ON public.team_trophies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "trophies_insert_owner"
  ON public.team_trophies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_owner(auth.uid(), team_id));

CREATE POLICY "trophies_update_owner"
  ON public.team_trophies FOR UPDATE
  TO authenticated
  USING (public.is_team_owner(auth.uid(), team_id))
  WITH CHECK (public.is_team_owner(auth.uid(), team_id));

CREATE POLICY "trophies_delete_owner"
  ON public.team_trophies FOR DELETE
  TO authenticated
  USING (public.is_team_owner(auth.uid(), team_id));

CREATE TRIGGER team_trophies_touch
  BEFORE UPDATE ON public.team_trophies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Elo update on signed sumula
CREATE OR REPLACE FUNCTION public.recompute_team_elo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k constant numeric := 24;
  ra numeric; rb numeric;
  ea numeric; eb numeric;
  sa numeric; sb numeric;
  goal_factor numeric;
  diff int;
BEGIN
  IF NEW.status <> 'completed' OR NEW.home_score IS NULL OR NEW.away_score IS NULL
     OR NEW.home_team_id IS NULL OR NEW.away_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only run when transitioning into completed/scored, to avoid re-applying.
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'completed'
     AND OLD.home_score IS NOT DISTINCT FROM NEW.home_score
     AND OLD.away_score IS NOT DISTINCT FROM NEW.away_score THEN
    RETURN NEW;
  END IF;

  SELECT rating INTO ra FROM public.teams WHERE id = NEW.home_team_id FOR UPDATE;
  SELECT rating INTO rb FROM public.teams WHERE id = NEW.away_team_id FOR UPDATE;
  IF ra IS NULL OR rb IS NULL THEN RETURN NEW; END IF;

  ea := 1.0 / (1.0 + power(10.0, (rb - ra) / 400.0));
  eb := 1.0 - ea;

  IF NEW.home_score > NEW.away_score THEN sa := 1; sb := 0;
  ELSIF NEW.home_score < NEW.away_score THEN sa := 0; sb := 1;
  ELSE sa := 0.5; sb := 0.5;
  END IF;

  diff := abs(NEW.home_score - NEW.away_score);
  goal_factor := CASE
    WHEN diff <= 1 THEN 1.0
    WHEN diff = 2 THEN 1.5
    ELSE (11.0 + diff) / 8.0
  END;

  UPDATE public.teams SET rating = round(ra + k * goal_factor * (sa - ea), 2)
   WHERE id = NEW.home_team_id;
  UPDATE public.teams SET rating = round(rb + k * goal_factor * (sb - eb), 2)
   WHERE id = NEW.away_team_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS matches_recompute_team_elo ON public.matches;
CREATE TRIGGER matches_recompute_team_elo
  AFTER INSERT OR UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.recompute_team_elo();