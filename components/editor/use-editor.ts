'use client';

import { useCallback, useRef } from 'react';
import { marked } from 'marked';

interface UseEditorProps {
  onChange: (value: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
  readOnly?: boolean;
}

export function useEditor({ onChange, editorRef, readOnly = false }: UseEditorProps) {
  const isComposing = useRef(false);

  const execCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current || readOnly) return;

    // Handle special commands
    if (command === 'heading') {
      document.execCommand('formatBlock', false, value || 'p');
    } else if (command === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
    } else if (command === 'code') {
      const selection = window.getSelection();
      if (!selection?.toString()) return;

      const range = selection.getRangeAt(0);
      const code = document.createElement('code');
      code.textContent = selection.toString();
      range.deleteContents();
      range.insertNode(code);
    } else if (command === 'createLink') {
      const selection = window.getSelection();
      if (!selection?.toString()) return;

      const url = window.prompt('Enter URL:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
        // Make links open in new tab
        const link = selection.anchorNode?.parentElement;
        if (link?.tagName === 'A') {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else {
      // Default commands
      document.execCommand(command, false, value);
    }

    // Ensure editor keeps focus
    editorRef.current.focus();
    
    // Trigger change
    handleInput();
  }, [editorRef, readOnly]);

  const queryState = useCallback((command: string): boolean => {
    return document.queryCommandState(command);
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing.current || readOnly) return;
    
    // Convert HTML to Markdown
    const html = editorRef.current.innerHTML;
    const markdown = convertToMarkdown(html);
    onChange(markdown);
  }, [onChange, readOnly]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, [readOnly]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;

    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          execCommand('createLink');
          break;
      }
    }

    // Handle tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  }, [execCommand, readOnly]);

  const setInitialContent = useCallback((content: string) => {
    if (!editorRef.current) return;

    if (readOnly) {
      // For read-only mode, convert markdown to HTML using marked
      const html = marked(content, { breaks: true });
      editorRef.current.innerHTML = html;
    } else {
      // For edit mode, convert markdown to editor-friendly HTML
      const html = convertToHtml(content);
      editorRef.current.innerHTML = html;
    }
  }, [readOnly]);

  return {
    execCommand,
    queryState,
    handleInput,
    handlePaste,
    handleKeyDown,
    setInitialContent,
  };
}

// Convert HTML to Markdown
function convertToMarkdown(html: string): string {
  let markdown = html;

  // Replace blockquotes
  markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n');

  // Replace headings
  markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n');
  markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n');

  // Replace lists
  markdown = markdown.replace(/<ul>(.*?)<\/ul>/g, (_, content) => {
    return content.replace(/<li>(.*?)<\/li>/g, '- $1\n');
  });
  markdown = markdown.replace(/<ol>(.*?)<\/ol>/g, (_, content) => {
    let index = 1;
    return content.replace(/<li>(.*?)<\/li>/g, () => `${index++}. $1\n`);
  });

  // Replace inline styles
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
  markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');
  markdown = markdown.replace(/<u>(.*?)<\/u>/g, '_$1_');
  markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');

  // Replace links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

  // Clean up
  markdown = markdown
    .replace(/<\/?p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

// Convert Markdown to HTML for display
function convertToHtml(markdown: string): string {
  let html = markdown;

  // Convert blockquotes
  html = html.replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');

  // Convert headings
  html = html.replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');

  // Convert lists
  html = html.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\.\s+(.*?)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*?<\/li>)\n(<li>.*?<\/li>)/g, '$1$2');
  html = html.replace(/(<li>.*?<\/li>)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Convert inline styles
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<u>$1</u>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Convert links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Wrap paragraphs
  html = html
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p)
    .map(p => `<p>${p}</p>`)
    .join('');

  return html;
}