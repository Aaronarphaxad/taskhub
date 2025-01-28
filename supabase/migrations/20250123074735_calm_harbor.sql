/*
  # Add Row Level Security Policies

  1. Security Changes
    - Enable RLS on all tables
    - Add policies for organizations table
    - Add policies for admins table
    - Add policies for categories table
    - Add policies for guides table

  2. Access Control
    - Organizations are viewable by their admins
    - Admins can view/edit their organization's data
    - Categories and guides are managed by organization admins
*/

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Admins can view their organization's admins"
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

-- Categories policies
CREATE POLICY "Categories are viewable by organization admins"
  ON categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Categories are manageable by organization admins"
  ON categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

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

-- Public access policy for guides
CREATE POLICY "Guides are publicly accessible with valid access token"
  ON guides FOR SELECT
  TO anon
  USING (
    requires_auth = false OR 
    access_token = current_setting('request.jwt.claims')::json->>'access_token'
  );