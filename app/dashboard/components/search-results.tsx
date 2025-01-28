'use client';

import { Guide } from '../types';
import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface SearchResultProps {
  guide: Guide;
  onSelect: (guide: Guide) => void;
}

export function SearchResult({ guide, onSelect }: SearchResultProps) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-4 py-3 h-auto"
      onClick={() => onSelect(guide)}
    >
      <div className="flex flex-col gap-1.5 items-start text-left">
        <h3 className="font-medium">{guide.title}</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(guide.created_at), 'MMM d, yyyy')}
          </div>
          {typeof guide.views === 'number' && guide.views > 0 && (
            <>
              <span className="text-xs">•</span>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {guide.views} views
              </div>
            </>
          )}
          {guide.category?.name && (
            <>
              <span className="text-xs">•</span>
              <span>{guide.category.name}</span>
            </>
          )}
        </div>
      </div>
    </Button>
  );
}

interface SearchResultsProps {
  guides: Guide[];
  onSelect: (guide: Guide) => void;
}

export function SearchResults({ guides, onSelect }: SearchResultsProps) {
  return (
    <div className="space-y-1 rounded-lg border bg-card">
      {guides.map((guide) => (
        <SearchResult key={guide.id} guide={guide} onSelect={onSelect} />
      ))}
    </div>
  );
}