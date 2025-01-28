/*
  # Remove RLS policies and keep relationships

  This migration removes all RLS policies while maintaining table relationships
  and core functionality.

  1. Changes
    - Disable RLS on all tables
    - Remove all RLS policies
    - Keep foreign key relationships intact
    - Maintain existing indexes
*/

-- Disable RLS on all tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE guides DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Organizations are viewable by authenticated users of the organization" ON organizations;
DROP POLICY IF EXISTS "Users can view members of their organization" ON users;
DROP POLICY IF EXISTS "Categories are viewable by organization members" ON categories;
DROP POLICY IF EXISTS "Categories are editable by organization admins" ON categories;
DROP POLICY IF EXISTS "Guides are viewable by organization members" ON guides;
DROP POLICY IF EXISTS "Guides are editable by organization admins" ON guides;