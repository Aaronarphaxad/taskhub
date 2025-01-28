/*
  # Create initial schema without RLS

  This migration creates all necessary tables without RLS policies
  while maintaining relationships between tables.

  1. Tables Created
    - organizations
    - users
    - categories
    - guides
  
  2. Relationships
    - users -> organizations (many-to-one)
    - categories -> organizations (many-to-one)
    - guides -> categories (many-to-one)
    - guides -> organizations (many-to-one)
    - guides -> users (many-to-one)
*/

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
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
  created_by uuid REFERENCES users NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_guides_category ON guides(category_id);
CREATE INDEX idx_guides_organization ON guides(organization_id);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_users_organization ON users(organization_id);