-- Norsk Eventyr 8.0.0: internal trigger RPC hardening.
-- Trigger functions must only run as triggers/service role, never as public PostgREST RPCs.

revoke execute on function public.ne_access_lifecycle_trigger() from public, anon, authenticated;
revoke execute on function public.ne_entitlement_lifecycle_trigger() from public, anon, authenticated;
revoke execute on function public.ne_install_lifecycle_trigger() from public, anon, authenticated;
revoke execute on function public.ne_payment_lifecycle_trigger() from public, anon, authenticated;
revoke execute on function public.ne_subscription_lifecycle_trigger() from public, anon, authenticated;
