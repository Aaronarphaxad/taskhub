-- First, ensure we're using the correct column name consistently
ALTER TABLE organizations RENAME COLUMN code TO unique_code;

-- Recreate the index with the correct column name
DROP INDEX IF EXISTS idx_organizations_code;
CREATE INDEX idx_organizations_code ON organizations(unique_code);

-- Update any existing references in the application
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey,
  ADD CONSTRAINT organization_members_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE CASCADE;