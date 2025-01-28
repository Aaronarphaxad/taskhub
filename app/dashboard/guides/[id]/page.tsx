'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Pencil, Pin, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Guide {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  is_pinned: boolean;
  category: { name: string } | null;
}

export default function GuidePage({ params }: { params: { id: string } }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        let organizationId: string | null = null;

        // Check for authenticated session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setCurrentUserId(session.user.id);
          
          // Get user's organization and role
          const { data: membershipData } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', session.user.id)
            .single();

          if (membershipData) {
            organizationId = membershipData.organization_id;
            setIsAdmin(membershipData.role === 'admin');
          }
        } else {
          // Check for organization code access
          const storedAccess = storage.getAccess();
          if (!storedAccess) {
            router.push('/');
            return;
          }

          // Get organization ID from code
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('unique_code', storedAccess.code)
            .single();

          if (org) {
            organizationId = org.id;
          } else {
            storage.clearAccess();
            router.push('/');
            return;
          }
        }

        if (!organizationId) {
          throw new Error('No organization access');
        }

        // Fetch the guide
        const { data: guideData, error: guideError } = await supabase
          .from('guides')
          .select(`
            id,
            title,
            content,
            created_at,
            created_by,
            is_pinned,
            category:categories(name)
          `)
          .eq('id', params.id)
          .eq('organization_id', organizationId)
          .single();

        if (guideError) {
          if (guideError.code === 'PGRST116') {
            // Guide not found
            router.push('/dashboard');
            toast({
              title: 'Guide not found',
              description: 'The requested guide does not exist or you do not have access to it.',
              variant: 'destructive',
            });
            return;
          }
          throw guideError;
        }

        setGuide(guideData);
      } catch (error: any) {
        console.error('Error fetching guide:', error);
        toast({
          title: 'Error',
          description: 'Failed to load guide. Please try again.',
          variant: 'destructive',
        });
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [params.id, router, toast]);

  const handleTogglePin = async () => {
    if (!guide) return;

    try {
      const { error } = await supabase
        .from('guides')
        .update({ is_pinned: !guide.is_pinned })
        .eq('id', guide.id);

      if (error) throw error;

      setGuide({ ...guide, is_pinned: !guide.is_pinned });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse space-y-4 w-full max-w-3xl">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Guides
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-semibold mb-2">Guide not found</h3>
            <p className="text-muted-foreground">
              The requested guide does not exist or you do not have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="gap-2 group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Guides
        </Button>
        {isAdmin && (
          <div className="flex gap-2">
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
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard?edit=${guide.id}`)}
              className="gap-2 group hover:scale-105 transition-transform"
            >
              <Pencil className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Edit Guide
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-card">
          <div className="space-y-4">
            <CardTitle className="text-3xl flex items-center gap-3">
              {guide.title}
              {guide.is_pinned && (
                <Pin className="h-5 w-5 text-primary fill-current" />
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(guide.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {guide.category?.name || 'Uncategorized'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div 
            className="prose dark:prose-invert max-w-none animate-in fade-in duration-700"
            dangerouslySetInnerHTML={{ __html: guide.content }}
          />
        </CardContent>
      </Card>
    </div>
  );
}