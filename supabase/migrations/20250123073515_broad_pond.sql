/*
  # New Schema for Code-Based Organization Access

  1. Tables
    - organizations
      - id: Primary key
      - name: Organization name
      - code: Unique access code
      - created_at: Timestamp
    
    - users
      - id: Primary key (auth.users reference)
      - email: User's email
      - organization_id: Reference to organization
      - access_level: enum ('read_only', 'full_access')
      - created_at: Timestamp
    
    - categories
      - id: Primary key
      - name: Category name
      - description: Optional description
      - organization_id: Reference to organization
      - created_at: Timestamp
    
    - guides
      - id: Primary key
      - title: Guide title
      - content: Guide content
      - category_id: Optional reference to category
      - organization_id: Reference to organization
      - created_by: Reference to creating user
      - public_access: Boolean for direct access without login
      - access_token: Unique token for public access
      - updated_at: Last update timestamp
      - created_at: Creation timestamp

  2. Changes
    - Added organization code field
    - Added user access levels
    - Added public access capabilities for guides
    - Removed previous tables and recreated with new structure
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS guides CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Create enum for user access levels
CREATE TYPE user_access_level AS ENUM ('read_only', 'full_access');

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  organization_id uuid REFERENCES organizations NOT NULL,
  access_level user_access_level NOT NULL DEFAULT 'read_only',
  created_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Guides table
CREATE TABLE guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid REFERENCES categories,
  organization_id uuid REFERENCES organizations NOT NULL,
  created_by uuid REFERENCES users NOT NULL,
  public_access boolean NOT NULL DEFAULT false,
  access_token uuid UNIQUE DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_guides_category ON guides(category_id);
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_guides_access_token ON guides(access_token);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_organizations_code ON organizations(code);

-- Create a trigger function to automatically create user records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, organization_id, access_level)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(
      (NEW.raw_user_meta_data->>'access_level')::user_access_level,
      'read_only'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();