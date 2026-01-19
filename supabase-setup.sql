-- Supabase Setup Script for dyad.berlin
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvases table
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  entry_point_note_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Notes table (canvas-scoped)
CREATE TABLE IF NOT EXISTS notes (
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  wikilinks TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (canvas_id, slug)
);

-- Card positions table
CREATE TABLE IF NOT EXISTS card_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  parent_card_id TEXT,
  source_link_x REAL,
  source_link_y REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvas_id, note_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_is_published ON canvases(is_published);
CREATE INDEX IF NOT EXISTS idx_notes_canvas_id ON notes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_card_positions_canvas_id ON card_positions(canvas_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_positions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (TRUE);

-- Canvases policies
CREATE POLICY "Users can view their own canvases"
  ON canvases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published canvases"
  ON canvases FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Users can create their own canvases"
  ON canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvases"
  ON canvases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvases"
  ON canvases FOR DELETE
  USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view notes linked to published canvases"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM card_positions
      JOIN canvases ON canvases.id = card_positions.canvas_id
      WHERE card_positions.note_id = notes.slug
      AND canvases.user_id = notes.user_id
      AND canvases.is_published = TRUE
    )
  );

CREATE POLICY "Users can create their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Card positions policies
CREATE POLICY "Users can view card positions for their canvases"
  ON card_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = card_positions.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view card positions for published canvases"
  ON card_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = card_positions.canvas_id
      AND canvases.is_published = TRUE
    )
  );

CREATE POLICY "Users can manage card positions for their canvases"
  ON card_positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = card_positions.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_card_positions_updated_at
  BEFORE UPDATE ON card_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE SETUP
-- ============================================
-- Run this in the Supabase Dashboard > Storage

-- 1. Create a bucket named "uploads"
-- 2. Make it public
-- 3. Add the following RLS policies:

-- Policy: "Allow authenticated uploads"
-- Target: INSERT
-- Definition: (auth.role() = 'authenticated')

-- Policy: "Users can manage their own files"
-- Target: ALL
-- Definition: (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text)

-- Policy: "Public access to uploads"
-- Target: SELECT
-- Definition: (bucket_id = 'uploads')
