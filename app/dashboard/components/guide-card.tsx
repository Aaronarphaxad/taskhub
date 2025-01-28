'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, Pencil, Lock, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Guide } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface GuideCardProps {
  guide: Guide;
  isAdmin: boolean;
  canEdit: boolean;
  onView: (guide: Guide) => void;
  onEdit: (guide: Guide) => void;
  onTogglePin: (guide: Guide, e: React.MouseEvent) => void;
}

export function GuideCard({ guide, isAdmin, canEdit, onView, onEdit, onTogglePin }: GuideCardProps) {
  // Format the date to relative time
  const formattedDate = formatDistanceToNow(new Date(guide.created_at), { addSuffix: true });

  return (
    <Card
      className="hover:shadow-md transition-all group cursor-pointer relative overflow-hidden bg-background"
      onClick={() => onView(guide)}
    >
      {/* Pin indicator */}
      {guide.is_pinned && (
        <div className="absolute top-0 left-0 w-0 h-0 border-t-[24px] border-l-[24px] border-primary border-r-transparent border-b-transparent">
          <Pin className="absolute -top-[20px] -left-[20px] h-3.5 w-3.5 text-primary-foreground transform rotate-45" />
        </div>
      )}

      <div className="p-4 flex items-center gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1.5">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors pr-16 truncate">
              {guide.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="truncate">{formattedDate}</span>
              </div>
              {guide.category?.name && (
                <>
                  <span className="text-xs">•</span>
                  <span className="bg-secondary/50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    {guide.category.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(isAdmin || canEdit) ? (
            <>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(guide, e);
                  }}
                  className={cn(
                    "h-8 w-8 transition-all hover:scale-105",
                    guide.is_pinned && "text-primary"
                  )}
                >
                  <Pin className={cn(
                    "h-4 w-4",
                    guide.is_pinned && "fill-current"
                  )} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(guide);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Card>
  );
}