-- First, drop existing tables in the correct order
DO $$ 
BEGIN
    DROP TABLE IF EXISTS guide_comments CASCADE;
    DROP TABLE IF EXISTS user_guide_access CASCADE;
    DROP TABLE IF EXISTS guides CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS organizations CASCADE;
    DROP TYPE IF EXISTS guide_access_level CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create ENUM for guide access level
DO $$ 
BEGIN
    CREATE TYPE guide_access_level AS ENUM ('read_only', 'editable');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guides table
CREATE TABLE guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  access_level guide_access_level NOT NULL DEFAULT 'read_only',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User guide access tracking
CREATE TABLE user_guide_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, guide_id)
);

-- Guide comments
CREATE TABLE guide_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
DO $$ 
BEGIN
    CREATE INDEX idx_users_organization ON users(organization_id);
    CREATE INDEX idx_guides_organization ON guides(organization_id);
    CREATE INDEX idx_guides_category ON guides(category_id);
    CREATE INDEX idx_categories_organization ON categories(organization_id);
    CREATE INDEX idx_user_guide_access_user ON user_guide_access(user_id);
    CREATE INDEX idx_user_guide_access_guide ON user_guide_access(guide_id);
    CREATE INDEX idx_guide_comments_guide ON guide_comments(guide_id);
    CREATE INDEX idx_guide_comments_user ON guide_comments(user_id);
    CREATE INDEX idx_organizations_code ON organizations(unique_code);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guide_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_comments ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Allow public access to organizations table for registration
CREATE POLICY "Allow public organization creation"
  ON organizations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Organizations policies for authenticated users
CREATE POLICY "Organizations are viewable by their users"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

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

-- Categories policies
CREATE POLICY "Categories are viewable by organization members"
  ON categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Categories are manageable by organization admins"
  ON categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- Guides policies
CREATE POLICY "Guides are viewable by organization members"
  ON guides FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id
    )
  );

CREATE POLICY "Guides are manageable by organization admins"
  ON guides FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth.uid() = id AND role = 'admin'
    )
  );

-- User guide access policies
CREATE POLICY "Users can track their own guide access"
  ON user_guide_access FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Guide comments policies
CREATE POLICY "Comments are viewable by organization members"
  ON guide_comments FOR SELECT
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
  ON guide_comments FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, organization_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();