-- Create a function to generate the search vector
CREATE OR REPLACE FUNCTION guides_search_vector(title text, content text)
RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search column to guides table
ALTER TABLE guides ADD COLUMN IF NOT EXISTS search tsvector
  GENERATED ALWAYS AS (guides_search_vector(title, content)) STORED;

-- Create a GIN index for full-text search
CREATE INDEX IF NOT EXISTS guides_search_idx ON guides USING GIN (search);