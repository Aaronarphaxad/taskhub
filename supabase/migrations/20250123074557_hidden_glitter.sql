/*
  # Initial Schema Setup for Documentation Platform

  1. Tables
    - organizations: Stores business information and their unique access codes
    - admins: Stores organization administrators (business owners/managers)
    - categories: Organizes documentation into groups
    - guides: Stores the actual documentation content

  2. Features
    - Organization access via unique codes
    - Admin-only authentication
    - Guide access with optional authentication
    - Automatic admin record creation on auth signup
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS guides CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Admins table (organization administrators)
CREATE TABLE admins (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  organization_id uuid REFERENCES organizations NOT NULL,
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
  created_by uuid REFERENCES admins NOT NULL,
  requires_auth boolean NOT NULL DEFAULT true,
  access_token uuid UNIQUE DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_guides_category ON guides(category_id);
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_guides_access_token ON guides(access_token);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_admins_organization ON admins(organization_id);
CREATE INDEX idx_organizations_code ON organizations(code);

-- Create a trigger function to automatically create admin records
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.admins (id, email, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();