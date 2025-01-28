/*
  # Initial Schema Setup

  1. Tables
    - organizations: Stores organization details
      - id (uuid, primary key)
      - name (text)
      - unique_code (text, unique)
      - created_at (timestamptz)
    
    - users: Stores user information
      - id (uuid, primary key, links to auth.users)
      - email (text)
      - organization_id (uuid, references organizations)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unique_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Users table (simplified)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_organizations_code ON organizations(unique_code);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Organizations are viewable by their users"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Organizations are insertable during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users policies
CREATE POLICY "Users can view members of their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can be created during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();