-- First, disable RLS temporarily to clean up policies
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE guides DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_guide_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_comments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow public organization creation" ON organizations;
DROP POLICY IF EXISTS "Organizations are viewable by their users" ON organizations;
DROP POLICY IF EXISTS "Users can view members of their organization" ON users;
DROP POLICY IF EXISTS "Users can be created during signup" ON users;
DROP POLICY IF EXISTS "Categories are viewable by organization members" ON categories;
DROP POLICY IF EXISTS "Categories are manageable by organization admins" ON categories;
DROP POLICY IF EXISTS "Guides are viewable by organization members" ON guides;
DROP POLICY IF EXISTS "Guides are manageable by organization admins" ON guides;
DROP POLICY IF EXISTS "Users can track their own guide access" ON user_guide_access;
DROP POLICY IF EXISTS "Comments are viewable by organization members" ON guide_comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON guide_comments;

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guide_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_comments ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Allow organization creation for everyone (including unauthenticated)
CREATE POLICY "Allow organization creation"
  ON organizations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow organization selection for everyone (needed for login)
CREATE POLICY "Allow organization lookup"
  ON organizations
  FOR SELECT
  TO public
  USING (true);

-- Organizations policies for authenticated users
CREATE POLICY "Organizations are manageable by their users"
  ON organizations
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

-- Users policies
CREATE POLICY "Users can view members of their organization"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Allow user creation"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Categories policies
CREATE POLICY "Categories are viewable by organization members"
  ON categories
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Categories are manageable by organization admins"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- Guides policies
CREATE POLICY "Guides are viewable by organization members"
  ON guides
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Guides are manageable by organization admins"
  ON guides
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- User guide access policies
CREATE POLICY "Users can track their own guide access"
  ON user_guide_access
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Guide comments policies
CREATE POLICY "Comments are viewable by organization members"
  ON guide_comments
  FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE auth.uid() = id
      )
    )
  );

CREATE POLICY "Users can manage their own comments"
  ON guide_comments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());