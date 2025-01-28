/*
  # Add guest permissions setting

  1. Changes
    - Add `allow_guest_write` column to organizations table
    - Default to false for security
*/

-- Add allow_guest_write column to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS allow_guest_write BOOLEAN NOT NULL DEFAULT false;