'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Editor } from '@/components/editor/editor';
import { Category, Guide } from '../types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGuide: Guide | null;
  categories: Category[];
  title: string;
  content: string;
  categoryId: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function GuideDialog({
  open,
  onOpenChange,
  editingGuide,
  categories,
  title,
  content,
  categoryId,
  onTitleChange,
  onContentChange,
  onCategoryChange,
  onSave,
  onCancel,
}: GuideDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        description: 'Please enter a title for your guide',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      toast({
        description: editingGuide ? 'Guide updated successfully' : 'Guide created successfully',
      });
    } catch (error) {
      toast({
        description: 'Failed to save guide. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen flex flex-col p-2 gap-0 rounded-none">
        <DialogHeader className="flex-shrink-0 p-6 border-b pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Enter guide title"
                className="text-2xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
              />
              <DialogDescription>
                {editingGuide
                  ? 'Make changes to your guide below'
                  : 'Add a new guide to your organization'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : (editingGuide ? 'Update Guide' : 'Create Guide')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="md:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={onCategoryChange}>
              <SelectTrigger id="category" className="w-[200px]">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Editor
            value={content}
            onChange={onContentChange}
            placeholder="Write your guide content here..."
            className="h-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}