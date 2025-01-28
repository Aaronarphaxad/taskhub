'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, Pin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { Guide } from './types';
import { useGuides } from './hooks/use-guides';
import { GuideCard } from './components/guide-card';
import { GuideDialog } from './components/guide-dialog';
import { GuideView } from './components/guide-view';
import { Pagination } from './components/pagination';
import { SearchFilters } from './components/search-filters';
import { debounce } from 'lodash';

const GUIDES_PER_PAGE = 10;

export default function DashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const [newGuideCategoryId, setNewGuideCategoryId] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [canEdit, setCanEdit] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize guides hook with view tracking
  const { guides = [], setGuides, categories = [], loading, updateGuides, searchGuides, incrementViews } = useGuides(organizationId);

  // Enhanced filtering logic
  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    
    return guides.filter(guide => {
      // Search in title, content, and category
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
      const guideText = `${guide.title} ${guide.content} ${guide.category?.name || ''}`.toLowerCase();
      
      // Match all search terms (AND logic)
      const matchesSearch = searchTerms.length === 0 || 
        searchTerms.every(term => guideText.includes(term));

      // Category filtering
      const matchesCategory = 
        selectedCategory === 'all' || 
        (selectedCategory === 'Uncategorized' && !guide.category?.name) ||
        guide.category?.name === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [guides, searchQuery, selectedCategory]);

  // Handle search with debounce
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!organizationId) return;
      
      setSearchQuery(query);

      if (!query.trim() && selectedCategory === 'all') {
        // If no search query and no category filter, fetch all guides
        await updateGuides();
      } else {
        // Otherwise, perform search
        const results = await searchGuides(query, selectedCategory);
        setGuides(results as Guide[]);
      }
    }, 300),
    [organizationId, selectedCategory]
  );

  // Handle guide view
  const handleGuideView = async (guide: Guide) => {
    await incrementViews(guide.id);
  };

  // Check authentication and access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsAuthenticated(true);
          
          const { data: membershipData } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', session.user.id)
            .single();

          if (membershipData) {
            setOrganizationId(membershipData.organization_id);
            setIsAdmin(membershipData.role === 'admin');
            setCanEdit(true);
          }
        } else {
          const code = storage.getAccess();
          if (!code) {
            router.push('/');
            return;
          }

          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, allow_guest_write')
            .eq('unique_code', code)
            .maybeSingle();

          if (orgError && orgError.code !== 'PGRST116') {
            throw orgError;
          }

          if (!org) {
            storage.clearAccess();
            throw new Error('Invalid organization code');
          }

          setOrganizationId(org.id);
          setIsAdmin(false);
          setIsAuthenticated(false);
          setCanEdit(org.allow_guest_write);
        }
      } catch (error: any) {
        console.error('Error checking access:', error);
        storage.clearAccess();
        toast({
          description: 'Please sign in or enter an organization code',
          variant: 'destructive',
        });
        router.push('/');
      }
    };

    checkAccess();
  }, [router, toast]);

  // Separate pinned and unpinned guides
  const { pinnedGuides, unpinnedGuides } = useMemo(() => {
    const pinned = filteredGuides.filter(guide => guide.is_pinned);
    const unpinned = filteredGuides.filter(guide => !guide.is_pinned);
    return { pinnedGuides: pinned, unpinnedGuides: unpinned };
  }, [filteredGuides]);

  // Calculate pagination for unpinned guides
  const totalPages = Math.ceil(unpinnedGuides.length / GUIDES_PER_PAGE);
  const paginatedGuides = unpinnedGuides.slice(
    (currentPage - 1) * GUIDES_PER_PAGE,
    currentPage * GUIDES_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const handleTogglePin = async (guide: Guide) => {
    // e.stopPropagation();
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('guides')
        .update({ is_pinned: !guide.is_pinned })
        .eq('id', guide.id);

      if (error) throw error;

      setGuides(guides.map(g => 
        g.id === guide.id ? { ...g, is_pinned: !guide.is_pinned } : g
      ));

      if (selectedGuide?.id === guide.id) {
        setSelectedGuide({ ...guide, is_pinned: !guide.is_pinned });
      }

      toast({
        title: 'Success',
        description: guide.is_pinned ? 'Guide unpinned' : 'Guide pinned',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update guide',
        variant: 'destructive',
      });
    }
  };

  const handleSaveGuide = async () => {
    if (!organizationId) return;

    try {
      const guideData = {
        title: newGuideTitle,
        content: newGuideContent,
        organization_id: organizationId,
        category_id: newGuideCategoryId === 'none' ? null : newGuideCategoryId,
        created_by: null
      };

      if (editingGuide) {
        const { error } = await supabase
          .from('guides')
          .update(guideData)
          .eq('id', editingGuide.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('guides')
          .insert([guideData]);

        if (error) throw error;
      }

      await updateGuides();
      setIsGuideDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving guide:', error);
      throw error;
    }
  };

  const handleDeleteGuide = async (guide: Guide) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('guides')
        .delete()
        .eq('id', guide.id);

      if (error) throw error;

      setGuides(guides.filter(g => g.id !== guide.id));
      setIsViewDialogOpen(false);
      setSelectedGuide(null);

      toast({
        title: 'Success',
        description: 'Guide deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete guide',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingGuide(null);
    setNewGuideTitle('');
    setNewGuideContent('');
    setNewGuideCategoryId('none');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="space-y-2">
                  <div className="h-6 w-3/4 bg-muted rounded"></div>
                  <div className="h-4 w-1/4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Documentation</h1>
          <p className="text-gray-600">
            {isAuthenticated 
              ? isAdmin 
                ? "Manage your organization's documentation"
                : "View and contribute to your organization's documentation"
              : canEdit
                ? "Create and edit documentation"
                : "Browse organization documentation"}
          </p>
        </div>
        {(isAdmin || canEdit) && (
          <Button className="bg-slate-950 text-white hover:bg-blue-700 transition duration-200" onClick={() => {
            resetForm();
            setIsGuideDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Guide
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          handleSearch(query);
        }}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
      />

      {/* Guides List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
        {/* Pinned Guides */}
        {pinnedGuides.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Pinned Guides
            </h2>
            <div className="grid gap-4">
              {pinnedGuides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                  onView={(guide) => {
                    setSelectedGuide(guide);
                    setIsViewDialogOpen(true);
                  }}
                  onEdit={(guide) => {
                    setEditingGuide(guide);
                    setNewGuideTitle(guide.title);
                    setNewGuideContent(guide.content);
                    setNewGuideCategoryId(guide.category?.id || 'none');
                    setIsGuideDialogOpen(true);
                  }}
                  onTogglePin={(guide) => handleTogglePin(guide)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Other Guides */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {searchQuery ? 'Search Results' : 'All Guides'}
          </h2>

          {filteredGuides.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No guides found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== 'all'
                    ? "No guides match your search criteria"
                    : (isAdmin || canEdit)
                    ? "Create your first guide to get started"
                    : "No guides are available yet"}
                </p>
                {(isAdmin || canEdit) && !searchQuery && selectedCategory === 'all' && (
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 transition duration-200" onClick={() => {
                    resetForm();
                    setIsGuideDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Guide
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedGuides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    isAdmin={isAdmin}
                    canEdit={canEdit}
                    onView={(guide) => {
                      setSelectedGuide(guide);
                      setIsViewDialogOpen(true);
                    }}
                    onEdit={(guide) => {
                      setEditingGuide(guide);
                      setNewGuideTitle(guide.title);
                      setNewGuideContent(guide.content);
                      setNewGuideCategoryId(guide.category?.id || 'none');
                      setIsGuideDialogOpen(true);
                    }}
                    onTogglePin={(guide) => handleTogglePin(guide)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Guide View Dialog */}
      <GuideView
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        guide={selectedGuide}
        isAdmin={isAdmin}
        canEdit={canEdit}
        onEdit={(guide) => {
          setEditingGuide(guide);
          setNewGuideTitle(guide.title);
          setNewGuideContent(guide.content);
          setNewGuideCategoryId(guide.category?.id || 'none');
          setIsGuideDialogOpen(true);
          setIsViewDialogOpen(false);
        }}
        onTogglePin={(guide: Guide) => handleTogglePin(guide)}
        onDelete={(guide: Guide) => handleDeleteGuide(guide)}
        onView={(guide: Guide) => handleGuideView(guide)}
      />

      {/* Edit/Create Guide Dialog */}
      {(isAdmin || canEdit) && (
        <GuideDialog
          open={isGuideDialogOpen}
          onOpenChange={setIsGuideDialogOpen}
          editingGuide={editingGuide}
          categories={categories}
          title={newGuideTitle}
          content={newGuideContent}
          categoryId={newGuideCategoryId}
          onTitleChange={setNewGuideTitle}
          onContentChange={setNewGuideContent}
          onCategoryChange={setNewGuideCategoryId}
          onSave={handleSaveGuide}
          onCancel={() => {
            setIsGuideDialogOpen(false);
            resetForm();
          }}
        />
      )}
    </div>
  );
}