/*
  # Updated Schema with Enhanced Guide Management

  1. New Tables and Types
    - Create guide_access_level enum
    - Organizations table with unique code
    - Users table with role management
    - Guides table with access level control
    - User guide access tracking
    - Categories for organizing guides
    - Guide comments for collaboration
    
  2. Changes
    - Drop existing tables to start fresh
    - Add new tracking and organizational features
    - Enhance guide access control
    - Add commenting capability
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS guide_permissions CASCADE;
DROP TABLE IF EXISTS guides CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS guide_access_level CASCADE;

-- Create ENUM for guide access level
CREATE TYPE guide_access_level AS ENUM ('read_only', 'editable');

-- Organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table for organizing guides
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guides table
CREATE TABLE guides (
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
CREATE TABLE user_guide_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, guide_id)
);

-- Guide comments for collaboration
CREATE TABLE guide_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_guides_category ON guides(category_id);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_user_guide_access_user ON user_guide_access(user_id);
CREATE INDEX idx_user_guide_access_guide ON user_guide_access(guide_id);
CREATE INDEX idx_guide_comments_guide ON guide_comments(guide_id);
CREATE INDEX idx_guide_comments_user ON guide_comments(user_id);
CREATE INDEX idx_organizations_code ON organizations(unique_code);

-- Create trigger function for new user creation
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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();