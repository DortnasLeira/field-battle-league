
-- 1) profiles.email exposure: restrict profiles SELECT to own row
DROP POLICY IF EXISTS "profiles_auth_read" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

-- 2) payouts: revoke Stripe identifier columns from end-user roles
REVOKE SELECT (stripe_payment_intent_id, stripe_transfer_id) ON public.payouts FROM authenticated;
REVOKE SELECT (stripe_payment_intent_id, stripe_transfer_id) ON public.payouts FROM anon;

-- 3) subscriptions: revoke Stripe identifier columns from end-user roles
REVOKE SELECT (stripe_subscription_id, stripe_customer_id) ON public.subscriptions FROM authenticated;
REVOKE SELECT (stripe_subscription_id, stripe_customer_id) ON public.subscriptions FROM anon;

-- 4) referee_hires: allow referee to read incoming hire requests
CREATE POLICY "referee_hires_select_referee"
ON public.referee_hires
FOR SELECT
TO authenticated
USING ((SELECT auth.uid())::text = referee_id);

-- Also allow referee to update status (accept/decline) of own hires
CREATE POLICY "referee_hires_update_referee"
ON public.referee_hires
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid())::text = referee_id)
WITH CHECK ((SELECT auth.uid())::text = referee_id);

-- 5) venues.phone: revoke from anonymous; keep authenticated access
REVOKE SELECT (phone) ON public.venues FROM anon;
