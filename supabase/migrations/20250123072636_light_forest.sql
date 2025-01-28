/*
  # Initial Schema Setup

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `created_at` (timestamp)
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `organization_id` (uuid, references organizations)
      - `role` (text)
      - `created_at` (timestamp)
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `organization_id` (uuid, references organizations)
      - `created_at` (timestamp)
    - `guides`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `category_id` (uuid, references categories)
      - `organization_id` (uuid, references organizations)
      - `created_by` (uuid, references users)
      - `updated_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access
    - Set up user trigger for automatic user creation
*/

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by authenticated users of the organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  organization_id uuid REFERENCES organizations,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'member'))
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organization"
  ON users FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth.uid() = id
  ));

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by organization members"
  ON categories FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth.uid() = id
  ));

CREATE POLICY "Categories are editable by organization admins"
  ON categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- Guides table
CREATE TABLE guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid REFERENCES categories,
  organization_id uuid REFERENCES organizations NOT NULL,
  created_by uuid REFERENCES users NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides are viewable by organization members"
  ON guides FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth.uid() = id
  ));

CREATE POLICY "Guides are editable by organization admins"
  ON guides FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_guides_category ON guides(category_id);
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Create a trigger function to automatically create user records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, organization_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE((NEW.raw_user_meta_data->>'role'), 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();