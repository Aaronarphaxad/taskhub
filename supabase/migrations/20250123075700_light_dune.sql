/*
  # Disable RLS on all tables

  1. Changes
    - Disable RLS on all tables
    - Drop all existing RLS policies
*/

-- Disable RLS on all tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE guides DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_permissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow organization creation" ON organizations;
DROP POLICY IF EXISTS "Organizations are viewable by their admins" ON organizations;
DROP POLICY IF EXISTS "Organizations are updatable by their admins" ON organizations;
DROP POLICY IF EXISTS "Organizations are deletable by their admins" ON organizations;
DROP POLICY IF EXISTS "Allow admin creation" ON admins;
DROP POLICY IF EXISTS "Admins can view organization admins" ON admins;
DROP POLICY IF EXISTS "Guides are viewable by organization admins" ON guides;
DROP POLICY IF EXISTS "Public guides are accessible to anyone" ON guides;
DROP POLICY IF EXISTS "Guides are manageable by organization admins" ON guides;
DROP POLICY IF EXISTS "Guide permissions are viewable by admins" ON guide_permissions;
DROP POLICY IF EXISTS "Guide permissions are manageable by admins" ON guide_permissions;