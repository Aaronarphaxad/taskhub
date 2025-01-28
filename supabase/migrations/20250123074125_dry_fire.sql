/*
  # Organization Admin Schema

  1. Tables
    - organizations
      - id: Primary key
      - name: Organization name
      - code: Unique access code for staff to view docs
      - created_at: Timestamp
    
    - admins (users)
      - id: Primary key (auth.users reference)
      - email: Admin's email
      - organization_id: Reference to organization
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
      - created_by: Reference to admin who created it
      - requires_auth: Boolean to control if authentication is required
      - access_token: Unique token for public access
      - updated_at: Last update timestamp
      - created_at: Creation timestamp

  2. Changes
    - Renamed users table to admins to better reflect their role
    - Added organization access code for staff viewing
    - Added public access control for guides
    - Simplified access control (either requires auth or not)
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS guides CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Admins table (formerly users)
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