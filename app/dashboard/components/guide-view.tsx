'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Pin, Pencil, Trash2, Calendar, Tag, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Guide } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { useEffect, memo, useCallback } from 'react';
import { format } from 'date-fns';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
);

interface GuideViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: Guide | null;
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: (guide: Guide) => void;
  onTogglePin: (guide: Guide) => void;
  onDelete: (guide: Guide) => void;
  onView?: (guide: Guide) => void;
}

const GuideView = memo(function GuideView({
  open,
  onOpenChange,
  guide,
  isAdmin,
  canEdit,
  onEdit,
  onTogglePin,
  onDelete,
  onView,
}: GuideViewProps) {
  // Memoize handlers
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleEdit = useCallback(() => guide && onEdit(guide), [guide, onEdit]);
  const handleTogglePin = useCallback(() => guide && onTogglePin(guide), [guide, onTogglePin]);
  const handleDelete = useCallback(() => guide && onDelete(guide), [guide, onDelete]);

  // Track view when guide is opened
  useEffect(() => {
    if (open && guide && onView) {
      onView(guide);
    }
  }, [open, guide, onView]);

  if (!guide) return null;

  const formattedDate = format(new Date(guide.created_at), 'MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 border-b">
          <DialogTitle className="sr-only">View Guide</DialogTitle>
          <div className="flex flex-col gap-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="gap-2 group w-fit"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Guides
              </Button>
              {(isAdmin || canEdit) && (
                <div className="flex gap-2 flex-wrap">
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleTogglePin}
                        className="hover:scale-105 transition-transform"
                      >
                        <Pin className={cn(
                          "h-4 w-4 transition-all",
                          guide.is_pinned && "fill-current text-primary"
                        )} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Guide</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this guide? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="gap-2 group"
                  >
                    <Pencil className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Title and Metadata */}
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-semibold flex items-center gap-3 break-words">
                {guide.title}
                {guide.is_pinned && (
                  <Pin className="h-5 w-5 text-primary fill-current flex-shrink-0" />
                )}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {formattedDate}
                </div>
                {guide.category?.name && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 flex-shrink-0" />
                    {guide.category.name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 flex-shrink-0" />
                  {guide.views || 0} views
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Guide Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8">
            <div className="max-w-[65ch] mx-auto">
              <MarkdownPreview source={guide.content} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

GuideView.displayName = 'GuideView';

export { GuideView };