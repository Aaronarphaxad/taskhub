/*
  # Fix Organization Registration Policies

  1. Changes
    - Update organizations table RLS policies
    - Add policy for organization creation during registration
    - Ensure proper access control for admins

  2. Security
    - Maintain secure access to organization data
    - Allow initial organization creation
    - Protect against unauthorized access
*/

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Organizations are viewable by their admins" ON organizations;
DROP POLICY IF EXISTS "Organizations are insertable during signup" ON organizations;

-- Create new policies for organizations
CREATE POLICY "Organizations are viewable by their admins"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

-- Allow organization creation without restrictions during signup
CREATE POLICY "Allow organization creation"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow organization updates by admins
CREATE POLICY "Organizations are updatable by their admins"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );

-- Allow organization deletion by admins
CREATE POLICY "Organizations are deletable by their admins"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM admins 
      WHERE auth.uid() = id
    )
  );