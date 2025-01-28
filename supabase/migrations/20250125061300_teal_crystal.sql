-- Drop existing search function and index
DROP INDEX IF EXISTS guides_search_idx;
DROP FUNCTION IF EXISTS guides_search_vector;

-- Create improved search vector function
CREATE OR REPLACE FUNCTION guides_search_vector(title text, content text)
RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('simple', COALESCE(lower(title), '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(lower(content), '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recreate search column with improved configuration
ALTER TABLE guides DROP COLUMN IF EXISTS search;
ALTER TABLE guides ADD COLUMN search tsvector
  GENERATED ALWAYS AS (guides_search_vector(title, content)) STORED;

-- Create GIN index for improved search performance
CREATE INDEX guides_search_idx ON guides USING GIN (search);