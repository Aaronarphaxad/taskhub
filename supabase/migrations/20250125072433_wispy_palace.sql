/*
  # Add view tracking to guides

  1. Changes
    - Add views column to guides table
    - Create function to safely increment views
    - Add index for view count sorting

  2. Security
    - Enable RLS for the views column
    - Add safe increment function
*/

-- Add views column to guides table
ALTER TABLE guides ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- Create index for sorting by views
CREATE INDEX IF NOT EXISTS idx_guides_views ON guides(views);

-- Create function to safely increment views
CREATE OR REPLACE FUNCTION increment_guide_views(guide_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE guides
  SET views = views + 1
  WHERE id = guide_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_guide_views TO authenticated;
GRANT EXECUTE ON FUNCTION increment_guide_views TO anon;