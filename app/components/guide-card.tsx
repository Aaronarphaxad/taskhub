import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GuideCardProps {
  guide: {
    title: string;
    content: string;
    is_pinned: boolean;
    category?: { name: string };
    views?: number;
    updated_at?: string;
  };
  isAdmin: boolean;
  canEdit: boolean;
  onView: (guide: any) => void;
  onEdit: (guide: any) => void;
  onTogglePin: (guide: any, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function GuideCard({ guide, isAdmin, canEdit, onView, onEdit, onTogglePin }: GuideCardProps) {
  const formattedDate = guide.updated_at
    ? formatDistanceToNow(new Date(guide.updated_at), {
        addSuffix: true,
      })
    : null;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onView(guide);
  };

  return (
    <Card
      className="hover:shadow-md transition-all duration-200 bg-background group cursor-pointer relative overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Pin indicator */}
      {guide.is_pinned && (
        <div className="absolute top-0 left-0 w-0 h-0 border-t-[24px] border-l-[24px] border-primary border-r-transparent border-b-transparent">
          <Pin className="absolute -top-[20px] -left-[20px] h-3.5 w-3.5 text-primary-foreground transform rotate-45" />
        </div>
      )}

      <CardContent className="p-4 flex flex-col h-full space-y-3">
        {/* Title and Pin Button */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate pr-6">{guide.title}</h3>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => onTogglePin(guide, e)}
              className={`${
                guide.is_pinned ? 'text-primary' : 'text-muted-foreground'
              } -mr-2 -mt-1 p-1 h-auto flex-shrink-0 hover:bg-secondary`}
            >
              <Pin className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Content Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {guide.content.replace(/[#*`]/g, '')}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
          <div className="flex items-center gap-2 min-w-0">
            {guide.category && (
              <span className="inline-block bg-secondary/50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {guide.category.name}
              </span>
            )}
            {guide.views !== undefined && (
              <span className="flex items-center gap-1 shrink-0">
                <Eye className="h-3.5 w-3.5" /> {guide.views}
              </span>
            )}
          </div>
          {formattedDate && (
            <span className="text-[10px] shrink-0">{formattedDate}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(guide);
            }}
            className="h-7 text-xs flex-1"
          >
            View
          </Button>
          {(isAdmin || canEdit) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(guide);
              }}
              className="h-7 text-xs flex-1"
            >
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
