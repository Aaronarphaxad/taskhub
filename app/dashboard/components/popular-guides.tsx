'use client';

import { Guide } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, TrendingUp } from 'lucide-react';
import { SearchResult } from './search-results';

interface PopularGuidesProps {
  guides: Guide[];
  onSelect: (guide: Guide) => void;
}

export function PopularGuides({ guides, onSelect }: PopularGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Popular Guides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {guides.map((guide) => (
          <SearchResult key={guide.id} guide={guide} onSelect={onSelect} />
        ))}
      </CardContent>
    </Card>
  );
}