create table newsletter_posts (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  subtitle    text,
  author      text,
  published_at date       not null default current_date,
  teaser      text        not null default '',
  cover_image_url text,
  tags        text[]      not null default '{}',
  body        jsonb       not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  published   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table newsletter_posts enable row level security;

-- Public can read published posts
create policy "published newsletter posts are public"
  on newsletter_posts for select
  using (published = true);

-- Admins can do everything
create policy "admins can manage newsletter posts"
  on newsletter_posts for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
