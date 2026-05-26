
-- 1) Mask applicant phone numbers in opening_applications (revoke column-level access)
REVOKE SELECT (player_phone) ON public.opening_applications FROM authenticated, anon;

-- 2) Hide Stripe identifiers in payouts from end users
REVOKE SELECT (stripe_payment_intent_id, stripe_transfer_id) ON public.payouts FROM authenticated, anon;

-- 3) Prevent enumeration of user emails through profiles
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;

-- 4) Hide venue phone numbers from unauthenticated visitors
REVOKE SELECT (phone) ON public.venues FROM anon;

-- 5) Lock down Realtime channel subscriptions to topics scoped to the calling user.
--    Channels currently used: 'referee_hires_<uid>' (arbitragem) and 'subs-<uid>' (subscriptions).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own scoped realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own scoped realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('referee_hires_' || auth.uid()::text)
  OR realtime.topic() = ('subs-' || auth.uid()::text)
);

DROP POLICY IF EXISTS "Authenticated can join own scoped realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can join own scoped realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('referee_hires_' || auth.uid()::text)
  OR realtime.topic() = ('subs-' || auth.uid()::text)
);
