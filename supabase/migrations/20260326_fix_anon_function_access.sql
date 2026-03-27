-- Fix pre-existing security issue: confirm_user_email and get_registered_emails
-- were callable by the anon role, allowing email confirmation bypass and user enumeration.

REVOKE ALL ON FUNCTION public.confirm_user_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_user_email(text) FROM authenticated;

REVOKE ALL ON FUNCTION public.get_registered_emails() FROM anon;
REVOKE ALL ON FUNCTION public.get_registered_emails() FROM authenticated;
