'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Guide, Category } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const VIEW_DEBOUNCE_DELAY = 2000; // 2 seconds

interface CacheEntry {
  data: Guide[];
  timestamp: number;
}

interface GuideCache {
  [key: string]: CacheEntry;
}

export function useGuides(organizationId: string | null) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Cache ref to persist between renders
  const cacheRef = useRef<GuideCache>({});
  const viewTrackingRef = useRef<Set<string>>(new Set());

  // Debounced view increment with tracking
  const debouncedIncrementViews = useDebouncedCallback(
    async (guideId: string) => {
      try {
        // Check if we've already tracked this view in this session
        if (viewTrackingRef.current.has(guideId)) return;
        
        const { error } = await supabase.rpc('increment_guide_views', {
          guide_id: guideId
        });

        if (error) throw error;

        // Add to tracking set
        viewTrackingRef.current.add(guideId);

        // Update local state
        setGuides(currentGuides => 
          currentGuides.map(guide => 
            guide.id === guideId 
              ? { ...guide, views: (guide.views || 0) + 1 }
              : guide
          )
        );

        // Clear tracking after some time
        setTimeout(() => {
          viewTrackingRef.current.delete(guideId);
        }, VIEW_DEBOUNCE_DELAY);
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
    },
    VIEW_DEBOUNCE_DELAY,
    { maxWait: VIEW_DEBOUNCE_DELAY * 2 }
  );

  const getCacheKey = useCallback((query = '', category = 'all') => {
    return `${organizationId}:${query}:${category}`;
  }, [organizationId]);

  const isCacheValid = useCallback((cacheEntry: CacheEntry) => {
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  }, []);

  const fetchGuides = useCallback(async (query = '', category = 'all') => {
    if (!organizationId) return [];

    const cacheKey = getCacheKey(query, category);
    const cachedData = cacheRef.current[cacheKey];

    // Return cached data if valid
    if (cachedData && isCacheValid(cachedData)) {
      return cachedData.data;
    }

    try {
      let guidesQuery = supabase
        .from('guides')
        .select(`
          id,
          title,
          content,
          created_at,
          created_by,
          is_pinned,
          views,
          category:categories(name, id)
        `)
        .eq('organization_id', organizationId);

      if (query) {
        guidesQuery = guidesQuery.textSearch('search', query, {
          type: 'websearch',
          config: 'simple'
        });
      }

      if (category !== 'all') {
        guidesQuery = guidesQuery.eq('categories.name', category);
      }

      const { data, error } = await guidesQuery
        .order('is_pinned', { ascending: false })
        .order('views', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache the results
      cacheRef.current[cacheKey] = {
        data: data || [],
        timestamp: Date.now()
      };

      return data || [];
    } catch (error: any) {
      console.error('Error fetching guides:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load guides',
        variant: 'destructive',
      });
      return [];
    }
  }, [organizationId, getCacheKey, isCacheValid, toast]);

  const updateGuides = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    const data = await fetchGuides();
    setGuides(data);
    setLoading(false);
  }, [organizationId, fetchGuides]);

  const searchGuides = useCallback(async (query: string, category = 'all') => {
    if (!organizationId) return [];
    
    const data = await fetchGuides(query, category);
    setGuides(data);
    return data;
  }, [organizationId, fetchGuides]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        
        // Fetch categories and guides in parallel
        const [categoriesResponse] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('organization_id', organizationId)
            .order('name'),
          updateGuides()
        ]);

        if (categoriesResponse.error) throw categoriesResponse.error;
        setCategories(categoriesResponse.data || []);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [organizationId, updateGuides, toast]);

  // Set up real-time subscription for guide updates
  useEffect(() => {
    if (!organizationId) return;

    const subscription = supabase
      .channel('guides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guides',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Clear cache on any changes
          cacheRef.current = {};
          // Refresh guides
          updateGuides();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [organizationId, updateGuides]);

  return {
    guides,
    setGuides,
    categories,
    loading,
    updateGuides,
    searchGuides,
    incrementViews: debouncedIncrementViews,
  };
}