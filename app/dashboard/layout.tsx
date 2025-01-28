'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { BookOpen, Settings, LogOut, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>('Guest');
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // First check for authenticated session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsAuthenticated(true);
          const email = session.user.email;
          const name = email ? email.split('@')[0] : 'User';
          setUserName(name);

          // Get organization name for authenticated user
          const { data: membershipData } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .single();

          if (membershipData) {
            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', membershipData.organization_id)
              .single();

            if (org) {
              setOrgName(org.name);
            }
          }
        } else {
          // Check for stored access code
          const code = storage.getAccess();
          if (!code) {
            throw new Error('No access code found');
          }

          // Verify the code is valid
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('name')
            .eq('unique_code', code)
            .maybeSingle();

          if (orgError && orgError.code !== 'PGRST116') {
            throw orgError;
          }

          if (!org) {
            storage.clearAccess();
            throw new Error('Invalid organization code');
          }

          setOrgName(org.name);
          setUserName('Guest');
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        console.error('Error checking access:', error);
        storage.clearAccess();
        toast({
          title: 'Access Required',
          description: 'Please sign in or enter an organization code',
          variant: 'destructive',
        });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router, toast]);

  const handleSignOut = async () => {
    try {
      if (isAuthenticated) {
        await supabase.auth.signOut();
      }
      storage.clearAccess();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const navigation = [
    {
      name: 'Guides',
      href: '/dashboard',
      icon: BookOpen,
      exact: true
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      requiresAuth: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">TaskHub</h1>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated ? `Welcome back, ${userName}!` : 'Viewing as guest'}
            </p>
            {orgName && (
              <p className="text-sm font-medium">{orgName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-card border-r hidden md:block">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">TaskHub</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
          <div className="space-y-1 mb-6">
            <p className="text-sm text-muted-foreground">
              {isAuthenticated ? `Welcome back, ${userName}!` : 'Viewing as guest'}
            </p>
            {orgName && (
              <p className="text-sm font-medium">{orgName}</p>
            )}
          </div>
          <nav className="space-y-1">
            {navigation.map((item) => {
              if (item.requiresAuth && !isAuthenticated) return null;
              
              const isActive = item.exact 
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {isAuthenticated ? 'Sign Out' : 'Exit'}
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden">
        <nav className="flex justify-around p-4">
          {navigation.map((item) => {
            if (item.requiresAuth && !isAuthenticated) return null;

            const isActive = item.exact 
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs">{isAuthenticated ? 'Sign Out' : 'Exit'}</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 pb-20 md:pb-0">
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}