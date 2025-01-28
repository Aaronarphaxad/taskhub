/*
  # Clean Database Schema
  
  1. Changes
    - Single migration file that defines the complete database schema
    - Safely drops and recreates all tables
    - Includes all necessary indexes and triggers
    - No RLS policies (as requested)
*/

-- First, drop existing tables in the correct order to avoid dependency issues
DO $$ 
BEGIN
    -- Drop tables if they exist
    DROP TABLE IF EXISTS guide_comments CASCADE;
    DROP TABLE IF EXISTS user_guide_access CASCADE;
    DROP TABLE IF EXISTS guide_permissions CASCADE;
    DROP TABLE IF EXISTS guides CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS admins CASCADE;
    DROP TABLE IF EXISTS organizations CASCADE;
    
    -- Drop type if exists
    DROP TYPE IF EXISTS guide_access_level CASCADE;
EXCEPTION
    WHEN OTHERS THEN 
        NULL;
END $$;

-- Create ENUM for guide access level
DO $$ 
BEGIN
    CREATE TYPE guide_access_level AS ENUM ('read_only', 'editable');
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table for organizing guides
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guides table
CREATE TABLE IF NOT EXISTS guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  access_level guide_access_level NOT NULL DEFAULT 'read_only',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User guide access tracking
CREATE TABLE IF NOT EXISTS user_guide_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, guide_id)
);

-- Guide comments for collaboration
CREATE TABLE IF NOT EXISTS guide_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes (IF NOT EXISTS is not supported for indexes in PostgreSQL)
DO $$ 
BEGIN
    CREATE INDEX idx_users_organization ON users(organization_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_guides_organization ON guides(organization_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_guides_category ON guides(category_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_categories_organization ON categories(organization_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_user_guide_access_user ON user_guide_access(user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_user_guide_access_guide ON user_guide_access(guide_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_guide_comments_guide ON guide_comments(guide_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_guide_comments_user ON guide_comments(user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_organizations_code ON organizations(unique_code);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create or replace trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, organization_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();