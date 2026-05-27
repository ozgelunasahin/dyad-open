alter table public.contacts
  add column if not exists referral_source text;
