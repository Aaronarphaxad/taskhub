'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './toolbar';
import { cn } from '@/lib/utils';
import './styles.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

export function Editor({
  value,
  onChange,
  readOnly = false,
  className,
  placeholder = 'Start writing...'
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className={cn(
      'flex flex-col h-full border rounded-lg overflow-hidden bg-background',
      readOnly && 'border-none',
      className
    )}>
      {!readOnly && editor && (
        <EditorToolbar editor={editor} />
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent
          editor={editor}
          className={cn(
            'h-full prose dark:prose-invert max-w-none',
            'focus-within:ring-2 ring-primary/20 transition-all',
            readOnly && 'cursor-default focus-within:ring-0'
          )}
        />
      </div>
    </div>
  );
}