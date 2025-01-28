-- First drop existing search column and function
ALTER TABLE guides DROP COLUMN IF EXISTS search;
DROP FUNCTION IF EXISTS guides_search_vector CASCADE;

-- Create improved search vector function with better text handling
CREATE OR REPLACE FUNCTION guides_search_vector(title text, content text)
RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search column with proper configuration
ALTER TABLE guides ADD COLUMN search tsvector
  GENERATED ALWAYS AS (guides_search_vector(title, content)) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX guides_search_idx ON guides USING GIN (search);

-- Create function to handle search queries
CREATE OR REPLACE FUNCTION search_guides(search_query text)
RETURNS SETOF guides AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM guides
  WHERE search @@ plainto_tsquery('english', search_query)
  OR title ILIKE '%' || search_query || '%'
  OR content ILIKE '%' || search_query || '%'
  ORDER BY ts_rank(search, plainto_tsquery('english', search_query)) DESC;
END;
$$ LANGUAGE plpgsql;