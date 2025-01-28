/*
  # Add guide pinning functionality

  1. Changes
    - Add `is_pinned` boolean column to guides table with default value of false
    - Add index on is_pinned column for better performance when sorting
*/

-- Add is_pinned column to guides table
ALTER TABLE guides 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index for is_pinned column to improve sorting performance
CREATE INDEX IF NOT EXISTS idx_guides_is_pinned ON guides(is_pinned);