/*
  # Organization-based Documentation System Schema

  1. New Tables
    - organizations: Stores organization details and access codes
    - admins: Organization administrators who manage the content
    - guides: Documentation content with access control
    - guide_permissions: Controls who can edit specific guides

  2. Security
    - Enable RLS on all tables
    - Policies for organization-based access
    - Public access policies for guides
    - Edit permission controls

  3. Features
    - Organization code-based access
    - Guide-level edit permissions
    - Public access tokens for guides
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS guide_permissions CASCADE;
DROP TABLE IF EXISTS guides CASCADE;
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

-- Guides table
CREATE TABLE guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  organization_id uuid REFERENCES organizations NOT NULL,
  created_by uuid REFERENCES admins NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  allow_edit boolean NOT NULL DEFAULT false,
  access_token uuid UNIQUE DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Guide permissions table
CREATE TABLE guide_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES guides NOT NULL,
  organization_code text NOT NULL,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(guide_id, organization_code)
);

-- Create indexes for better performance
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_guides_access_token ON guides(access_token);
CREATE INDEX idx_admins_organization ON admins(organization_id);
CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_guide_permissions_code ON guide_permissions(organization_code);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_permissions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Organizations are viewable by their admins"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Organizations are insertable during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins policies
CREATE POLICY "Admins can view their organization's data"
  ON admins FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Admins can be created during signup"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Guides policies
CREATE POLICY "Guides are viewable by organization admins"
  ON guides FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Guides are manageable by organization admins"
  ON guides FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Public guides are accessible to anyone"
  ON guides FOR SELECT
  TO anon
  USING (is_public = true);

-- Guide permissions policies
CREATE POLICY "Guide permissions are viewable by organization admins"
  ON guide_permissions FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE organization_id IN (
        SELECT organization_id FROM admins
        WHERE auth.uid() = id
      )
    )
  );

CREATE POLICY "Guide permissions are manageable by organization admins"
  ON guide_permissions FOR ALL
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE organization_id IN (
        SELECT organization_id FROM admins
        WHERE auth.uid() = id
      )
    )
  );

-- Create trigger function for admin creation
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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();