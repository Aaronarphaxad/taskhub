-- Drop existing search column and function
ALTER TABLE guides DROP COLUMN IF EXISTS search;
DROP FUNCTION IF EXISTS guides_search_vector CASCADE;

-- Create improved search vector function with better text handling
CREATE OR REPLACE FUNCTION guides_search_vector(title text, content text)
RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('simple', COALESCE(lower(title), '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(lower(content), '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search column with proper configuration
ALTER TABLE guides ADD COLUMN search tsvector
  GENERATED ALWAYS AS (guides_search_vector(title, content)) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX guides_search_idx ON guides USING GIN (search);

-- Create function to handle search queries
CREATE OR REPLACE FUNCTION search_guides(search_query text, org_id uuid)
RETURNS SETOF guides AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM guides
  WHERE organization_id = org_id
  AND (
    search @@ plainto_tsquery('simple', lower(search_query))
    OR lower(title) LIKE '%' || lower(search_query) || '%'
    OR lower(content) LIKE '%' || lower(search_query) || '%'
  )
  ORDER BY 
    is_pinned DESC,
    ts_rank(search, plainto_tsquery('simple', lower(search_query))) DESC,
    created_at DESC;
END;
$$ LANGUAGE plpgsql;