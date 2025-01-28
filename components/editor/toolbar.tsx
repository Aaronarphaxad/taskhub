'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Quote, Code, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const tools = [
    {
      icon: Bold,
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      tooltip: 'Bold (⌘+B)',
    },
    {
      icon: Italic,
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      tooltip: 'Italic (⌘+I)',
    },
    {
      icon: Underline,
      command: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
      tooltip: 'Underline (⌘+U)',
    },
    null, // Separator
    {
      icon: Heading1,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
      tooltip: 'Heading 1',
    },
    {
      icon: Heading2,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      tooltip: 'Heading 2',
    },
    null, // Separator
    {
      icon: List,
      command: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      tooltip: 'Bullet List',
    },
    {
      icon: ListOrdered,
      command: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      tooltip: 'Numbered List',
    },
    null, // Separator
    {
      icon: Quote,
      command: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
      tooltip: 'Quote',
    },
    {
      icon: Code,
      command: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
      tooltip: 'Code',
    },
    {
      icon: Link,
      command: () => {
        const url = window.prompt('Enter URL:');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: () => editor.isActive('link'),
      tooltip: 'Insert Link (⌘+K)',
    },
  ];

  return (
    <div className="border-b p-1 flex items-center gap-1 flex-wrap">
      {tools.map((tool, i) => 
        tool === null ? (
          <Separator orientation="vertical" className="h-6 mx-1" key={`sep-${i}`} />
        ) : (
          <Button
            key={i}
            variant="ghost"
            size="sm"
            onClick={tool.command}
            className={cn(
              'h-8 w-8 p-0',
              tool.isActive() && 'bg-muted'
            )}
            title={tool.tooltip}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        )
      )}
    </div>
  );
}