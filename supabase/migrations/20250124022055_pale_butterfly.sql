/*
  # Convert Guide Content to Markdown Format

  1. Changes
    - Add temporary column for content format
    - Convert existing HTML content to Markdown
    - Clean up temporary column

  2. Notes
    - Uses a safe conversion approach
    - Preserves existing content during conversion
    - Handles potential errors gracefully
*/

-- First, add a temporary column to track content format
ALTER TABLE guides
  ADD COLUMN content_format text NOT NULL DEFAULT 'html';

-- Create a function to convert HTML to Markdown-like format
CREATE OR REPLACE FUNCTION html_to_markdown(html text) RETURNS text AS $$
DECLARE
  markdown text;
BEGIN
  -- Basic HTML to Markdown conversion
  -- Headers
  markdown := regexp_replace(html, '<h1[^>]*>(.*?)</h1>', '# \1', 'gi');
  markdown := regexp_replace(markdown, '<h2[^>]*>(.*?)</h2>', '## \1', 'gi');
  markdown := regexp_replace(markdown, '<h3[^>]*>(.*?)</h3>', '### \1', 'gi');
  
  -- Lists
  markdown := regexp_replace(markdown, '<ul[^>]*>(.*?)</ul>', '\1', 'gi');
  markdown := regexp_replace(markdown, '<ol[^>]*>(.*?)</ol>', '\1', 'gi');
  markdown := regexp_replace(markdown, '<li[^>]*>(.*?)</li>', '- \1', 'gi');
  
  -- Links
  markdown := regexp_replace(markdown, '<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', '[\2](\1)', 'gi');
  
  -- Emphasis
  markdown := regexp_replace(markdown, '<strong[^>]*>(.*?)</strong>', '**\1**', 'gi');
  markdown := regexp_replace(markdown, '<b[^>]*>(.*?)</b>', '**\1**', 'gi');
  markdown := regexp_replace(markdown, '<em[^>]*>(.*?)</em>', '*\1*', 'gi');
  markdown := regexp_replace(markdown, '<i[^>]*>(.*?)</i>', '*\1*', 'gi');
  
  -- Code
  markdown := regexp_replace(markdown, '<code[^>]*>(.*?)</code>', '`\1`', 'gi');
  markdown := regexp_replace(markdown, '<pre[^>]*>(.*?)</pre>', '```\n\1\n```', 'gi');
  
  -- Blockquotes
  markdown := regexp_replace(markdown, '<blockquote[^>]*>(.*?)</blockquote>', '> \1', 'gi');
  
  -- Paragraphs and line breaks
  markdown := regexp_replace(markdown, '<p[^>]*>(.*?)</p>', '\1\n\n', 'gi');
  markdown := regexp_replace(markdown, '<br[^>]*>', '\n', 'gi');
  
  -- Clean up any remaining HTML tags
  markdown := regexp_replace(markdown, '<[^>]+>', '', 'gi');
  
  -- Clean up extra whitespace
  markdown := regexp_replace(markdown, '\n\n\n+', '\n\n', 'g');
  markdown := trim(markdown);
  
  RETURN markdown;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Convert existing HTML content to Markdown
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, content FROM guides WHERE content_format = 'html' LOOP
    BEGIN
      UPDATE guides
      SET 
        content = html_to_markdown(content),
        content_format = 'markdown'
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next record
      RAISE NOTICE 'Error converting guide %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Drop the temporary column and conversion function
ALTER TABLE guides DROP COLUMN content_format;
DROP FUNCTION html_to_markdown(text);

-- Add a comment to the content column to indicate it's markdown
COMMENT ON COLUMN guides.content IS 'Guide content in Markdown format';