-- Baseline schema dump from remote Supabase (2026-03-25)
-- This replaces all prior incremental migrations.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."confirm_user_email"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      UPDATE auth.users
      SET email_confirmed_at = now()
      WHERE email = user_email AND email_confirmed_at IS NULL;
  END;
  $$;


ALTER FUNCTION "public"."confirm_user_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_registered_emails"() RETURNS TABLE("email" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
      SELECT email FROM auth.users;
  $$;


ALTER FUNCTION "public"."get_registered_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    INSERT INTO public.profiles (id, username, berlin_based)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
      ),
      COALESCE((NEW.raw_user_meta_data->>'berlin_based')::boolean, FALSE)
    );
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_site_canvas_position"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.position = 0 OR NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position) + 1, 1) INTO NEW.position
    FROM site_canvases WHERE site_id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_site_canvas_position"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_invitation"("invite_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    inv_id UUID;
  BEGIN
    SELECT id INTO inv_id
    FROM invitations
    WHERE token = invite_token
      AND used_at IS NULL
      AND expires_at > now();

    IF inv_id IS NULL THEN
      RETURN FALSE;
    END IF;

    UPDATE invitations
    SET used_at = now()
    WHERE id = inv_id;

    RETURN TRUE;
  END;
  $$;


ALTER FUNCTION "public"."use_invitation"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation"("invite_token" "text") RETURNS TABLE("email" "text", "valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      i.email,
      (i.used_at IS NULL AND i.expires_at > now()) AS valid
    FROM invitations i
    WHERE i.token = invite_token;
  END;
  $$;


ALTER FUNCTION "public"."validate_invitation"("invite_token" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "canvas_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."canvas_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canvas_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."canvas_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."canvases" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_published" boolean DEFAULT false,
    "entry_point_note_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cover_image_url" "text",
    "is_conversation" boolean DEFAULT false NOT NULL,
    "active_this_week" boolean DEFAULT false NOT NULL,
    "preferred_location" "text",
    "preferred_time_slots" "text",
    "is_archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."canvases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_positions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "canvas_id" "text" NOT NULL,
    "note_id" "text" NOT NULL,
    "x" real NOT NULL,
    "y" real NOT NULL,
    "width" real NOT NULL,
    "height" real NOT NULL,
    "parent_card_id" "text",
    "source_link_x" real,
    "source_link_y" real,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."card_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "highlight_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "freewrite" "text",
    "based_in" "text",
    "referred_by_username" "text"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "canvas_id" "text",
    "type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "reviewed_at" timestamp with time zone,
    "notes" "text",
    CONSTRAINT "feedback_context_check" CHECK (("pg_column_size"("context") < 10240)),
    CONSTRAINT "feedback_description_check" CHECK ((("char_length"("description") >= 10) AND ("char_length"("description") <= 5000))),
    CONSTRAINT "feedback_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'reviewed'::"text", 'in_progress'::"text", 'resolved'::"text", 'wont_fix'::"text"]))),
    CONSTRAINT "feedback_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'feature'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback" IS 'User feedback. user_id set to NULL on user deletion. Review via Supabase dashboard.';



COMMENT ON COLUMN "public"."feedback"."status" IS 'Workflow status: new, reviewed, in_progress, resolved, wont_fix';



COMMENT ON COLUMN "public"."feedback"."notes" IS 'Internal notes on how to address this feedback';



CREATE TABLE IF NOT EXISTS "public"."highlights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canvas_id" "text" NOT NULL,
    "note_slug" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "selected_text" "text" NOT NULL,
    "start_offset" integer NOT NULL,
    "end_offset" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invited_by" "uuid"
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_highlights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "image_url" "text",
    "link" "text",
    "canvas_id" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "format" "text" DEFAULT 'essay'::"text",
    "publish_date" "text",
    "proposed_date_1" timestamp with time zone,
    "proposed_date_2" timestamp with time zone,
    "neighborhood" "text",
    "body" "text"
);


ALTER TABLE "public"."landing_highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewee_id" "uuid" NOT NULL,
    "did_meet" boolean NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "body" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."meeting_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canvas_id" "text" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    "location" "text",
    "proposed_time" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "proposed_date" "text",
    CONSTRAINT "meeting_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."meeting_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "wikilinks" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "canvas_id" "text" NOT NULL
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['new_comment'::"text", 'meeting_invite'::"text", 'meeting_response'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarded" boolean DEFAULT false,
    "can_publish_sites" boolean DEFAULT false NOT NULL,
    "berlin_based" boolean DEFAULT false NOT NULL,
    "referred_by" "uuid",
    "display_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."can_publish_sites" IS 'Feature flag: user can publish canvases as public sites at /sites/username';



CREATE TABLE IF NOT EXISTS "public"."site_canvases" (
    "site_id" "uuid" NOT NULL,
    "canvas_id" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nav_note_id" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nav_label" "text"
);


ALTER TABLE "public"."site_canvases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "page_type" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "site_pages_page_type_check" CHECK (("page_type" = ANY (ARRAY['hero'::"text", 'contact'::"text", 'page'::"text"])))
);


ALTER TABLE "public"."site_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sites_slug_format" CHECK (("slug" ~ '^[a-z0-9-]+$'::"text"))
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_canvas_id_key" UNIQUE ("user_id", "canvas_id");



ALTER TABLE ONLY "public"."canvas_comments"
    ADD CONSTRAINT "canvas_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canvases"
    ADD CONSTRAINT "canvases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canvases"
    ADD CONSTRAINT "canvases_user_id_slug_key" UNIQUE ("user_id", "slug");



ALTER TABLE ONLY "public"."card_positions"
    ADD CONSTRAINT "card_positions_canvas_id_note_id_key" UNIQUE ("canvas_id", "note_id");



ALTER TABLE ONLY "public"."card_positions"
    ADD CONSTRAINT "card_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."highlights"
    ADD CONSTRAINT "highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."landing_highlights"
    ADD CONSTRAINT "landing_highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_feedback"
    ADD CONSTRAINT "meeting_feedback_meeting_id_reviewer_id_key" UNIQUE ("meeting_id", "reviewer_id");



ALTER TABLE ONLY "public"."meeting_feedback"
    ADD CONSTRAINT "meeting_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_invitations"
    ADD CONSTRAINT "meeting_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("canvas_id", "slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."site_canvases"
    ADD CONSTRAINT "site_canvases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_pages"
    ADD CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_user_id_slug_key" UNIQUE ("user_id", "slug");



CREATE INDEX "idx_canvas_comments_canvas" ON "public"."canvas_comments" USING "btree" ("canvas_id");



CREATE INDEX "idx_canvas_comments_user" ON "public"."canvas_comments" USING "btree" ("user_id");



CREATE INDEX "idx_canvases_active_conversations" ON "public"."canvases" USING "btree" ("updated_at" DESC) WHERE (("is_conversation" = true) AND ("active_this_week" = true) AND ("is_published" = true));



CREATE INDEX "idx_canvases_is_published" ON "public"."canvases" USING "btree" ("is_published");



CREATE INDEX "idx_canvases_user_id" ON "public"."canvases" USING "btree" ("user_id");



CREATE INDEX "idx_card_positions_canvas_id" ON "public"."card_positions" USING "btree" ("canvas_id");



CREATE INDEX "idx_comments_highlight" ON "public"."comments" USING "btree" ("highlight_id");



CREATE INDEX "idx_comments_user" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_feedback_created_at" ON "public"."feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_status" ON "public"."feedback" USING "btree" ("status");



CREATE INDEX "idx_feedback_user_id" ON "public"."feedback" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_highlights_canvas" ON "public"."highlights" USING "btree" ("canvas_id");



CREATE INDEX "idx_highlights_user" ON "public"."highlights" USING "btree" ("user_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_invited_by" ON "public"."invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_landing_highlights_canvas_id" ON "public"."landing_highlights" USING "btree" ("canvas_id");



CREATE INDEX "idx_meeting_feedback_meeting" ON "public"."meeting_feedback" USING "btree" ("meeting_id");



CREATE INDEX "idx_meeting_feedback_reviewee" ON "public"."meeting_feedback" USING "btree" ("reviewee_id");



CREATE INDEX "idx_meeting_invitations_canvas" ON "public"."meeting_invitations" USING "btree" ("canvas_id");



CREATE INDEX "idx_meeting_invitations_invitee" ON "public"."meeting_invitations" USING "btree" ("invitee_id");



CREATE INDEX "idx_meeting_invitations_inviter" ON "public"."meeting_invitations" USING "btree" ("inviter_id");



CREATE UNIQUE INDEX "idx_meeting_invitations_unique_pair" ON "public"."meeting_invitations" USING "btree" ("canvas_id", "inviter_id", "invitee_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_notes_canvas_id" ON "public"."notes" USING "btree" ("canvas_id");



CREATE INDEX "idx_notes_user_id" ON "public"."notes" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("read" = false);



CREATE INDEX "idx_profiles_referred_by" ON "public"."profiles" USING "btree" ("referred_by");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_site_canvases_canvas_id" ON "public"."site_canvases" USING "btree" ("canvas_id");



CREATE INDEX "idx_site_canvases_site_canvas" ON "public"."site_canvases" USING "btree" ("site_id", "canvas_id");



CREATE INDEX "idx_site_canvases_site_id" ON "public"."site_canvases" USING "btree" ("site_id");



CREATE INDEX "idx_sites_is_published" ON "public"."sites" USING "btree" ("is_published");



CREATE INDEX "idx_sites_user_id" ON "public"."sites" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_site_canvas_position_trigger" BEFORE INSERT ON "public"."site_canvases" FOR EACH ROW EXECUTE FUNCTION "public"."set_site_canvas_position"();



CREATE OR REPLACE TRIGGER "update_canvases_updated_at" BEFORE UPDATE ON "public"."canvases" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_card_positions_updated_at" BEFORE UPDATE ON "public"."card_positions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_notes_updated_at" BEFORE UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_sites_updated_at" BEFORE UPDATE ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canvas_comments"
    ADD CONSTRAINT "canvas_comments_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canvas_comments"
    ADD CONSTRAINT "canvas_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canvases"
    ADD CONSTRAINT "canvases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_positions"
    ADD CONSTRAINT "card_positions_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_highlight_id_fkey" FOREIGN KEY ("highlight_id") REFERENCES "public"."highlights"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "fk_notes_canvas" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."highlights"
    ADD CONSTRAINT "highlights_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."highlights"
    ADD CONSTRAINT "highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."landing_highlights"
    ADD CONSTRAINT "landing_highlights_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_highlights"
    ADD CONSTRAINT "landing_highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_feedback"
    ADD CONSTRAINT "meeting_feedback_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting_invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_feedback"
    ADD CONSTRAINT "meeting_feedback_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_feedback"
    ADD CONSTRAINT "meeting_feedback_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_invitations"
    ADD CONSTRAINT "meeting_invitations_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_invitations"
    ADD CONSTRAINT "meeting_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_invitations"
    ADD CONSTRAINT "meeting_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_canvases"
    ADD CONSTRAINT "site_canvases_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_canvases"
    ADD CONSTRAINT "site_canvases_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_pages"
    ADD CONSTRAINT "site_pages_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create invitations" ON "public"."invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."can_publish_sites" = true)))));



CREATE POLICY "Admins can read invitations" ON "public"."invitations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."can_publish_sites" = true)))));



CREATE POLICY "Admins can view contacts" ON "public"."contacts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."can_publish_sites" = true)))));



CREATE POLICY "Anyone can submit contact form" ON "public"."contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view card positions for highlighted canvases" ON "public"."card_positions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."landing_highlights"
  WHERE ("landing_highlights"."canvas_id" = "card_positions"."canvas_id"))));



CREATE POLICY "Anyone can view card positions for published canvases" ON "public"."card_positions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "card_positions"."canvas_id") AND ("canvases"."is_published" = true)))));



CREATE POLICY "Anyone can view highlighted canvases" ON "public"."canvases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."landing_highlights"
  WHERE ("landing_highlights"."canvas_id" = "canvases"."id"))));



CREATE POLICY "Anyone can view notes in highlighted canvases" ON "public"."notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."landing_highlights"
  WHERE ("landing_highlights"."canvas_id" = "notes"."canvas_id"))));



CREATE POLICY "Anyone can view published canvases" ON "public"."canvases" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Authenticated users can read canvas comments" ON "public"."canvas_comments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Create comments on published canvases" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."highlights"
     JOIN "public"."canvases" ON (("canvases"."id" = "highlights"."canvas_id")))
  WHERE (("highlights"."id" = "comments"."highlight_id") AND ("canvases"."is_published" = true))))));



CREATE POLICY "Create highlights on published canvases" ON "public"."highlights" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "highlights"."canvas_id") AND ("canvases"."is_published" = true))))));



CREATE POLICY "Create meeting invitations" ON "public"."meeting_invitations" FOR INSERT WITH CHECK (("auth"."uid"() = "inviter_id"));



CREATE POLICY "Delete own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Delete own highlights" ON "public"."highlights" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Insert notifications for authenticated users" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Owner can DELETE own site_canvases" ON "public"."site_canvases" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_canvases"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can DELETE own site_pages" ON "public"."site_pages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_pages"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can DELETE own sites" ON "public"."sites" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owner can INSERT own site_canvases" ON "public"."site_canvases" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_canvases"."site_id") AND ("sites"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "site_canvases"."canvas_id") AND ("canvases"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Owner can INSERT own site_pages" ON "public"."site_pages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_pages"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can INSERT sites" ON "public"."sites" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Owner can SELECT own site_canvases" ON "public"."site_canvases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_canvases"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can SELECT own site_pages" ON "public"."site_pages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_pages"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can SELECT own sites" ON "public"."sites" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owner can UPDATE own site_canvases" ON "public"."site_canvases" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_canvases"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can UPDATE own site_pages" ON "public"."site_pages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_pages"."site_id") AND ("sites"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can UPDATE own sites" ON "public"."sites" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owner delete" ON "public"."landing_highlights" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Owner insert" ON "public"."landing_highlights" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Owner update" ON "public"."landing_highlights" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can SELECT published site_canvases" ON "public"."site_canvases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_canvases"."site_id") AND ("sites"."is_published" = true)))));



CREATE POLICY "Public can SELECT published sites" ON "public"."sites" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published site_pages" ON "public"."site_pages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sites"
  WHERE (("sites"."id" = "site_pages"."site_id") AND ("sites"."is_published" = true)))));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."landing_highlights" FOR SELECT USING (true);



CREATE POLICY "Update own meeting invitations" ON "public"."meeting_invitations" FOR UPDATE USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id"))) WITH CHECK ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id")));



CREATE POLICY "Update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own canvases" ON "public"."canvases" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own canvases" ON "public"."canvases" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert feedback" ON "public"."feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own canvas comments" ON "public"."canvas_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own feedback" ON "public"."meeting_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage card positions for their canvases" ON "public"."card_positions" USING ((EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "card_positions"."canvas_id") AND ("canvases"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read feedback they gave or received" ON "public"."meeting_feedback" FOR SELECT USING ((("auth"."uid"() = "reviewer_id") OR ("auth"."uid"() = "reviewee_id")));



CREATE POLICY "Users can update their own canvases" ON "public"."canvases" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view card positions for their canvases" ON "public"."card_positions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "card_positions"."canvas_id") AND ("canvases"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own canvases" ON "public"."canvases" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "View comments on published canvases" ON "public"."comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."highlights"
     JOIN "public"."canvases" ON (("canvases"."id" = "highlights"."canvas_id")))
  WHERE (("highlights"."id" = "comments"."highlight_id") AND ("canvases"."is_published" = true)))));



CREATE POLICY "View highlights on published canvases" ON "public"."highlights" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canvases"
  WHERE (("canvases"."id" = "highlights"."canvas_id") AND ("canvases"."is_published" = true)))));



CREATE POLICY "View own meeting invitations" ON "public"."meeting_invitations" FOR SELECT USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id")));



CREATE POLICY "View own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookmarks_delete" ON "public"."bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "bookmarks_insert" ON "public"."bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "bookmarks_select" ON "public"."bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."canvas_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canvases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."card_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."highlights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_highlights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_delete" ON "public"."notes" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "notes_insert" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "notes_select_own" ON "public"."notes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "notes_select_published" ON "public"."notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canvases" "c"
  WHERE (("c"."id" = "notes"."canvas_id") AND ("c"."is_published" = true)))));



CREATE POLICY "notes_update" ON "public"."notes" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_canvases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."confirm_user_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_user_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_user_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registered_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_registered_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registered_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_site_canvas_position"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_site_canvas_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_site_canvas_position"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."use_invitation"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."use_invitation"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_invitation"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation"("invite_token" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."canvas_comments" TO "anon";
GRANT ALL ON TABLE "public"."canvas_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."canvas_comments" TO "service_role";



GRANT ALL ON TABLE "public"."canvases" TO "anon";
GRANT ALL ON TABLE "public"."canvases" TO "authenticated";
GRANT ALL ON TABLE "public"."canvases" TO "service_role";



GRANT ALL ON TABLE "public"."card_positions" TO "anon";
GRANT ALL ON TABLE "public"."card_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."card_positions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."highlights" TO "anon";
GRANT ALL ON TABLE "public"."highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."highlights" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."landing_highlights" TO "anon";
GRANT ALL ON TABLE "public"."landing_highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_highlights" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_feedback" TO "anon";
GRANT ALL ON TABLE "public"."meeting_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_invitations" TO "anon";
GRANT ALL ON TABLE "public"."meeting_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."site_canvases" TO "anon";
GRANT ALL ON TABLE "public"."site_canvases" TO "authenticated";
GRANT ALL ON TABLE "public"."site_canvases" TO "service_role";



GRANT ALL ON TABLE "public"."site_pages" TO "anon";
GRANT ALL ON TABLE "public"."site_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."site_pages" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































