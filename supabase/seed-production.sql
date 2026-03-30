-- Production seed data — starter conversations for alpha testers.
-- This is throwaway content to give the discover page something real to show.
-- Delete once real users have published enough conversations.
--
-- Run against remote:
--   npx supabase db execute --file supabase/seed-production.sql
--
-- Users are created through the normal invite flow, NOT here.
-- These prompts are authored by the test users that already exist in seed.sql.
-- If running on production, create the users first or change the author_ids.

-- ============================================
-- SEED USERS FOR PRODUCTION
-- (separate from test users — real-ish names)
-- ============================================

DO $$
DECLARE
  v_pw TEXT := crypt('dyad2026!', gen_salt('bf'));
  v_now TIMESTAMPTZ := NOW();
  v_meta JSONB := '{"provider":"email","providers":["email"]}'::jsonb;
BEGIN
  -- rami
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rami@seed.invalid', v_pw, v_now, v_now, v_meta, '{"username":"rami"}'::jsonb, v_now, v_now, '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'email', jsonb_build_object('sub','a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1','email','rami@seed.invalid'), v_now, v_now, v_now)
  ON CONFLICT DO NOTHING;

  -- jette
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jette@seed.invalid', v_pw, v_now, v_now, v_meta, '{"username":"jette"}'::jsonb, v_now, v_now, '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'email', jsonb_build_object('sub','b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2','email','jette@seed.invalid'), v_now, v_now, v_now)
  ON CONFLICT DO NOTHING;

  -- tomás
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tomas@seed.invalid', v_pw, v_now, v_now, v_meta, '{"username":"tomás"}'::jsonb, v_now, v_now, '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'email', jsonb_build_object('sub','c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3','email','tomas@seed.invalid'), v_now, v_now, v_now)
  ON CONFLICT DO NOTHING;

  -- leila
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leila@seed.invalid', v_pw, v_now, v_now, v_meta, '{"username":"leila"}'::jsonb, v_now, v_now, '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'email', jsonb_build_object('sub','d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4','email','leila@seed.invalid'), v_now, v_now, v_now)
  ON CONFLICT DO NOTHING;

  -- sam
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sam@seed.invalid', v_pw, v_now, v_now, v_meta, '{"username":"sam"}'::jsonb, v_now, v_now, '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'email', jsonb_build_object('sub','e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5','email','sam@seed.invalid'), v_now, v_now, v_now)
  ON CONFLICT DO NOTHING;
END $$;

INSERT INTO profiles (id, username, onboarded, can_publish_sites) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'rami', true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'jette', true, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'tomás', true, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'leila', true, false),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'sam', true, false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  onboarded = EXCLUDED.onboarded;

-- ============================================
-- CONVERSATIONS (prompts + time slots)
-- ============================================

-- ── 1. rami — seeker voice ──────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-001', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'Changing your mind about something you used to be sure about',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A few years ago I was so certain about how I wanted to live. The city, the job, the kind of people I''d surround myself with. I had this whole framework for it and it made sense."}]},{"type":"paragraph","content":[{"type":"text","text":"Then one thing shifted — I don''t even remember what exactly — and the rest just sort of fell apart. Not dramatically. More like noticing the furniture has been rearranged while you were sleeping."}]},{"type":"paragraph","content":[{"type":"text","text":"I''m curious about that moment for other people. The bit right before you admit to yourself that you were wrong."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1516410529446-2c777cb7366d?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '3 days', NOW() - interval '4 days', NOW() - interval '3 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000001-0001-0000-0000-000000000001', 'prod-prompt-001', NOW() + interval '2 days', 75,
   '{"place_id":"p1","name":"Café am Neuen See","address":"Lichtensteinallee 2, 10787 Berlin","lat":52.5095,"lng":13.3405}'::jsonb,
   'Tiergarten', 52.5145, 13.3501),
  ('f0000001-0001-0000-0000-000000000002', 'prod-prompt-001', NOW() + interval '5 days', 90,
   '{"place_id":"p2","name":"Shakespeare and Sons","address":"Warschauer Str. 74, 10243 Berlin","lat":52.5063,"lng":13.4495}'::jsonb,
   'Friedrichshain', 52.5063, 13.4495);

-- ── 2. rami — second prompt, shorter ────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-002', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'Who taught you how to argue?',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"My parents never argued in front of us so I genuinely had no model for it. First real disagreement with a partner and I just went quiet for two days because I didn''t know what else to do."}]},{"type":"paragraph","content":[{"type":"text","text":"Still figuring it out honestly. But I think the way you learned to handle conflict — or didn''t learn — shapes everything."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '1 day', NOW() - interval '2 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000002-0001-0000-0000-000000000001', 'prod-prompt-002', NOW() + interval '3 days', 60,
   '{"place_id":"p3","name":"Tempelhofer Feld Eingang Oderstr.","address":"Oderstraße 22, 12049 Berlin","lat":52.4740,"lng":13.4180}'::jsonb,
   'Neukölln', 52.4810, 13.4350);

-- ── 3. jette — explorer voice ───────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-003', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
   'The U-Bahn thing',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"ok so I ride the U8 most days and there''s this thing that happens where everyone is so carefully not looking at each other. Like a whole carriage of people pretending the other people don''t exist."}]},{"type":"paragraph","content":[{"type":"text","text":"But then sometimes someone''s dog does something or a kid drops their ice cream and suddenly everyone is a person again for thirty seconds. And then it''s over and we go back to our phones."}]},{"type":"paragraph","content":[{"type":"text","text":"What is that? Why do we need the excuse?"}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '2 days', NOW() - interval '3 days', NOW() - interval '2 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000003-0001-0000-0000-000000000001', 'prod-prompt-003', NOW() + interval '1 day', 60,
   '{"place_id":"p4","name":"Café Botanico","address":"Richardstraße 100, 12043 Berlin","lat":52.4790,"lng":13.4330}'::jsonb,
   'Neukölln', 52.4810, 13.4350),
  ('f0000003-0001-0000-0000-000000000002', 'prod-prompt-003', NOW() + interval '4 days', 60,
   '{"place_id":"p4","name":"Café Botanico","address":"Richardstraße 100, 12043 Berlin","lat":52.4790,"lng":13.4330}'::jsonb,
   'Neukölln', 52.4810, 13.4350),
  ('f0000003-0001-0000-0000-000000000003', 'prod-prompt-003', NOW() + interval '6 days', 75,
   '{"place_id":"p5","name":"Volkspark Friedrichshain","address":"Am Friedrichshain, 10407 Berlin","lat":52.5270,"lng":13.4370}'::jsonb,
   'Prenzlauer Berg', 52.5340, 13.4190);

-- ── 4. jette — second prompt, very short ────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-004', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
   'Weeknight cooking',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"I made the same pasta three times this week. Not because I love it, just because my brain couldn''t handle another decision by 8pm."}]},{"type":"paragraph","content":[{"type":"text","text":"Do other people have this? Where you want to eat well but the gap between wanting it and actually doing it is just... Tuesday."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '5 days', NOW() - interval '6 days', NOW() - interval '5 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000004-0001-0000-0000-000000000001', 'prod-prompt-004', NOW() + interval '2 days', 45,
   '{"place_id":"p6","name":"Markthalle Neun","address":"Eisenbahnstraße 42/43, 10999 Berlin","lat":52.5006,"lng":13.4284}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 5. tomás — in-betweener voice ───────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-005', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
   'I quit my job and I don''t have a plan',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Handed in my notice three weeks ago. Everyone keeps asking what''s next and I keep saying \"I''m figuring it out\" which is true but also I''m mostly just sleeping in and going to the Turkish supermarket at weird hours."}]},{"type":"paragraph","content":[{"type":"text","text":"There''s this specific anxiety that comes with not having an answer to \"so what do you do.\" I used to think it was a boring question. Turns out it was holding up more of my identity than I realised."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1476900164809-ff19b8ae5968?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '4 days', NOW() - interval '5 days', NOW() - interval '4 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000005-0001-0000-0000-000000000001', 'prod-prompt-005', NOW() + interval '3 days', 60,
   '{"place_id":"p7","name":"Körnerpark","address":"Schierker Straße 8, 12051 Berlin","lat":52.4700,"lng":13.4380}'::jsonb,
   'Neukölln', 52.4810, 13.4350),
  ('f0000005-0001-0000-0000-000000000002', 'prod-prompt-005', NOW() + interval '5 days', 60,
   '{"place_id":"p8","name":"Viktoriapark","address":"Kreuzbergstraße 15, 10965 Berlin","lat":52.4882,"lng":13.3809}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 6. leila — gatherer voice ───────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-006', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
   'The neighbourhood dinner problem',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"I help run a dinner thing in my building. Once a month, whoever wants to come, bring a dish, we eat together. It''s been going for two years and it''s great except for one thing: it''s the same twelve people."}]},{"type":"paragraph","content":[{"type":"text","text":"We put flyers in the Hausflur, we invited the new family on the fourth floor, we tried doing it in the courtyard in summer so people could wander in. Nothing. It''s just us."}]},{"type":"paragraph","content":[{"type":"text","text":"I don''t think it''s because people don''t want to connect. I think the format is wrong somehow. Or the ask is too big. I don''t know. I want to talk to someone about this who isn''t already in my bubble."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '2 days', NOW() - interval '3 days', NOW() - interval '2 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000006-0001-0000-0000-000000000001', 'prod-prompt-006', NOW() + interval '1 day', 90,
   '{"place_id":"p9","name":"Café Kotti","address":"Adalbertstraße 96, 10999 Berlin","lat":52.5010,"lng":13.4188}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238),
  ('f0000006-0001-0000-0000-000000000002', 'prod-prompt-006', NOW() + interval '4 days', 90,
   '{"place_id":"p9","name":"Café Kotti","address":"Adalbertstraße 96, 10999 Berlin","lat":52.5010,"lng":13.4188}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 7. sam — explorer/seeker hybrid ─────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-007', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
   'When did you last call someone instead of texting',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"My friend called me the other day. Didn''t text first, didn''t schedule it, just called. I stared at the phone for two rings because I couldn''t figure out if something was wrong."}]},{"type":"paragraph","content":[{"type":"text","text":"Nothing was wrong. She just wanted to talk. It was so nice and also I hated that my first reaction was alarm."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '1 day', NOW() - interval '2 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000007-0001-0000-0000-000000000001', 'prod-prompt-007', NOW() + interval '2 days', 60,
   '{"place_id":"p10","name":"Klunkerkranich","address":"Karl-Marx-Straße 66, 12043 Berlin","lat":52.4813,"lng":13.4316}'::jsonb,
   'Neukölln', 52.4810, 13.4350),
  ('f0000007-0001-0000-0000-000000000002', 'prod-prompt-007', NOW() + interval '3 days', 75,
   '{"place_id":"p11","name":"Mauerpark","address":"Bernauer Str. 63-64, 13355 Berlin","lat":52.5430,"lng":13.4020}'::jsonb,
   'Prenzlauer Berg', 52.5340, 13.4190),
  ('f0000007-0001-0000-0000-000000000003', 'prod-prompt-007', NOW() + interval '6 days', 60,
   '{"place_id":"p10","name":"Klunkerkranich","address":"Karl-Marx-Straße 66, 12043 Berlin","lat":52.4813,"lng":13.4316}'::jsonb,
   'Neukölln', 52.4810, 13.4350);

-- ── 8. tomás — second prompt ────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-008', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
   'Speaking German badly',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"B2 Deutsch and still can''t order a Brötchen without the person switching to English. I know my accent is bad but come on, I''m trying."}]},{"type":"paragraph","content":[{"type":"text","text":"The weird part is I think I''m a funnier person in German? Like I make more mistakes so I have to be more creative. My German jokes don''t land but the failed attempts are apparently hilarious."}]},{"type":"paragraph","content":[{"type":"text","text":"Would love to meet someone who also lives between languages and has feelings about it. In either language. Or both at once which is what usually happens."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '6 days', NOW() - interval '7 days', NOW() - interval '6 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000008-0001-0000-0000-000000000001', 'prod-prompt-008', NOW() + interval '1 day', 60,
   '{"place_id":"p12","name":"Admiralbrücke","address":"Admiralstraße, 10999 Berlin","lat":52.4952,"lng":13.4168}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238),
  ('f0000008-0001-0000-0000-000000000002', 'prod-prompt-008', NOW() + interval '2 days', 60,
   '{"place_id":"p13","name":"Café Ernst","address":"Oranienstraße 1, 10999 Berlin","lat":52.5020,"lng":13.4230}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238),
  ('f0000008-0001-0000-0000-000000000003', 'prod-prompt-008', NOW() + interval '5 days', 45,
   '{"place_id":"p12","name":"Admiralbrücke","address":"Admiralstraße, 10999 Berlin","lat":52.4952,"lng":13.4168}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 9. leila ────────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-009', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
   'What do your parents not understand about your life here',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"My mum keeps asking when I''m coming back. Not in a guilt trip way, she genuinely doesn''t get why someone would choose to live in a cold country where they don''t have family. Every time I try to explain she''s like \"but you have a bedroom here.\""}]},{"type":"paragraph","content":[{"type":"text","text":"She''s not wrong. I do have a bedroom there. The bedroom is not the point but I can never quite say what the point is."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '3 days', NOW() - interval '4 days', NOW() - interval '3 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000009-0001-0000-0000-000000000001', 'prod-prompt-009', NOW() + interval '2 days', 60,
   '{"place_id":"p14","name":"Yorckschlösschen","address":"Yorckstraße 15, 10965 Berlin","lat":52.4920,"lng":13.3830}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238),
  ('f0000009-0001-0000-0000-000000000002', 'prod-prompt-009', NOW() + interval '6 days', 75,
   '{"place_id":"p15","name":"Café Strauss","address":"Bergmannstraße 42, 10961 Berlin","lat":52.4895,"lng":13.3950}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 10. sam ──────────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-010', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
   'Walking somewhere you''ve never been',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"I pick a stop on the Ringbahn I''ve never gotten off at and just walk. No map. If I get lost that''s kind of the point."}]},{"type":"paragraph","content":[{"type":"text","text":"Last time I ended up at some allotment garden with a guy selling Kuchen from a folding table. He didn''t speak English, I barely speak German, we just sort of gestured at the cakes and it was great."}]},{"type":"paragraph","content":[{"type":"text","text":"Want to do one of these with a person. Pick a random stop, walk, see what happens."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '1 day', NOW() - interval '2 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000010-0001-0000-0000-000000000001', 'prod-prompt-010', NOW() + interval '4 days', 120,
   '{"place_id":"p16","name":"S Treptower Park","address":"S Treptower Park, 12435 Berlin","lat":52.4870,"lng":13.4620}'::jsonb,
   'Treptow', 52.4870, 13.4620);

-- ── 11. rami ────────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-011', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'Books that broke something in you',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Not \"changed your life\" in the inspirational sense. I mean a book that left you feeling kind of ruined for a while. Like you couldn''t go back to thinking the way you did before."}]},{"type":"paragraph","content":[{"type":"text","text":"For me it was Dept of Speculation by Jenny Offill. It''s tiny, you can read it in an afternoon, but something about the way she writes about a marriage falling apart — I couldn''t shake it for weeks. I kept rereading the same pages on the U-Bahn."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '5 days', NOW() - interval '6 days', NOW() - interval '5 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000011-0001-0000-0000-000000000001', 'prod-prompt-011', NOW() + interval '1 day', 90,
   '{"place_id":"p2","name":"Shakespeare and Sons","address":"Warschauer Str. 74, 10243 Berlin","lat":52.5063,"lng":13.4495}'::jsonb,
   'Friedrichshain', 52.5063, 13.4495),
  ('f0000011-0001-0000-0000-000000000002', 'prod-prompt-011', NOW() + interval '3 days', 75,
   '{"place_id":"p2","name":"Shakespeare and Sons","address":"Warschauer Str. 74, 10243 Berlin","lat":52.5063,"lng":13.4495}'::jsonb,
   'Friedrichshain', 52.5063, 13.4495);

-- ── 12. jette ───────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-012', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
   'The friend you lost track of',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There''s someone I was really close to in my early twenties. We didn''t fall out or anything, just drifted. Moved cities, got busy, the usual. I still think about her sometimes when I hear a certain song or pass a place we used to go."}]},{"type":"paragraph","content":[{"type":"text","text":"I looked her up online last year and she''s got a whole different life now. Kids, different country. It felt strange, like reading about a character in a book you''d forgotten."}]},{"type":"paragraph","content":[{"type":"text","text":"Does everyone have one of these?"}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '4 days', NOW() - interval '5 days', NOW() - interval '4 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000012-0001-0000-0000-000000000001', 'prod-prompt-012', NOW() + interval '5 days', 60,
   '{"place_id":"p17","name":"Café Hilde","address":"Metzstraße 36, 10405 Berlin","lat":52.5300,"lng":13.4260}'::jsonb,
   'Prenzlauer Berg', 52.5340, 13.4190);

-- ── 13. tomás ───────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-013', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
   'Doing things alone in public',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Went to the cinema alone for the first time last month. Felt weird for about five minutes and then it was honestly the best film experience I''ve had in ages. No one whispering, no negotiating what to see, just me and the screen."}]},{"type":"paragraph","content":[{"type":"text","text":"Now I eat alone at restaurants too. The waiter always asks \"just one?\" and I''m like yeah, just one, and it''s fine."}]},{"type":"paragraph","content":[{"type":"text","text":"But there''s a limit right? Like I don''t think I could go to a concert alone. Where''s your line?"}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '2 days', NOW() - interval '3 days', NOW() - interval '2 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000013-0001-0000-0000-000000000001', 'prod-prompt-013', NOW() + interval '3 days', 60,
   '{"place_id":"p18","name":"Il Kino","address":"Nansenstraße 22, 12047 Berlin","lat":52.4840,"lng":13.4310}'::jsonb,
   'Neukölln', 52.4810, 13.4350),
  ('f0000013-0001-0000-0000-000000000002', 'prod-prompt-013', NOW() + interval '5 days', 60,
   '{"place_id":"p18","name":"Il Kino","address":"Nansenstraße 22, 12047 Berlin","lat":52.4840,"lng":13.4310}'::jsonb,
   'Neukölln', 52.4810, 13.4350);

-- ── 14. leila ───────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-014', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
   'When was the last time you asked for help',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Real help, not \"can you pass the salt.\" Like admitting to another person that you couldn''t handle something on your own. I''m terrible at this. I''ll carry four bags of groceries up five flights before I''d ask my neighbour to hold the door."}]},{"type":"paragraph","content":[{"type":"text","text":"I know it''s a thing, the self-sufficiency trap. I just don''t know how to stop doing it. Somewhere I learned that needing people is weakness and I can''t find the undo button."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1517456793572-1d8efd6dc135?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '1 day', NOW() - interval '2 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000014-0001-0000-0000-000000000001', 'prod-prompt-014', NOW() + interval '2 days', 75,
   '{"place_id":"p19","name":"Görlitzer Park","address":"Görlitzer Str., 10997 Berlin","lat":52.4966,"lng":13.4370}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238),
  ('f0000014-0001-0000-0000-000000000002', 'prod-prompt-014', NOW() + interval '4 days', 60,
   '{"place_id":"p20","name":"Plänterwald","address":"Neue Krugallee, 12435 Berlin","lat":52.4790,"lng":13.4850}'::jsonb,
   'Treptow', 52.4870, 13.4620),
  ('f0000014-0001-0000-0000-000000000003', 'prod-prompt-014', NOW() + interval '6 days', 75,
   '{"place_id":"p19","name":"Görlitzer Park","address":"Görlitzer Str., 10997 Berlin","lat":52.4966,"lng":13.4370}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 15. sam ──────────────────────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-015', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
   'The worst advice you ever followed',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"\"Just be yourself.\" Said to me before a job interview when I was 22. I was myself. Myself was a nervous wreck who made a joke about the interviewer''s tie. Did not get the job."}]},{"type":"paragraph","content":[{"type":"text","text":"I collect bad advice now. It''s weirdly comforting. Everyone''s been given terrible guidance and somehow we''re all still here."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '6 days', NOW() - interval '7 days', NOW() - interval '6 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000015-0001-0000-0000-000000000001', 'prod-prompt-015', NOW() + interval '1 day', 45,
   '{"place_id":"p21","name":"Café Nest","address":"Görlitzer Str. 52, 10997 Berlin","lat":52.4970,"lng":13.4350}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ── 16. sam — third prompt ───────────────────────────────────────────

INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('prod-prompt-016', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
   'Stuff you only do in winter',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Berlin winter is four months of going straight home after work and eating soup in bed. I become a completely different person between November and March. More inward. More still. I read more but I also stare at walls more."}]},{"type":"paragraph","content":[{"type":"text","text":"A friend said she thinks of it as hibernation and I think that''s exactly right. But I want to know what other people do with that time. Like is everyone else also eating soup in bed or am I the only one."}]}]}'::jsonb,
   'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&h=400&fit=crop',
   'published', 'berlin', NOW() - interval '3 days', NOW() - interval '4 days', NOW() - interval '3 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('f0000016-0001-0000-0000-000000000001', 'prod-prompt-016', NOW() + interval '3 days', 60,
   '{"place_id":"p22","name":"Baumhaus Bar","address":"Gerichtstraße 65, 13347 Berlin","lat":52.5440,"lng":13.3700}'::jsonb,
   'Wedding', 52.5500, 13.3650),
  ('f0000016-0001-0000-0000-000000000002', 'prod-prompt-016', NOW() + interval '5 days', 60,
   '{"place_id":"p22","name":"Baumhaus Bar","address":"Gerichtstraße 65, 13347 Berlin","lat":52.5440,"lng":13.3700}'::jsonb,
   'Wedding', 52.5500, 13.3650);
