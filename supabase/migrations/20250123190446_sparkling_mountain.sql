-- Add RLS policies for organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Allow organization members to view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to create memberships during registration
CREATE POLICY "Users can create memberships"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to manage their own memberships
CREATE POLICY "Users can manage their own memberships"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());