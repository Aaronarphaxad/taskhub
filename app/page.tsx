'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { BookOpen, Users, Search, Shield, ArrowRight, Lock, Menu, Moon, Sun, Heart, Zap, FileText, Share2, Key, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { storage } from '@/lib/storage';

const styles = {
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
};

export default function Home() {
  const [organizationCode, setOrganizationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate code format
      if (!/^[A-Z0-9]{6}$/.test(organizationCode)) {
        throw new Error('Please enter a valid 6-character code');
      }

      // Check if organization exists
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('unique_code', organizationCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!organization) {
        throw new Error('Invalid organization code');
      }

      // Store the code and redirect
      storage.saveAccess(organizationCode);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      
      // Clear the input on error
      setOrganizationCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            TaskHub
          </span>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hover:bg-secondary"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button asChild variant="ghost" className="hover:bg-secondary">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/register">Create Organization</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <Button asChild variant="ghost" onClick={() => setIsMenuOpen(false)}>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/register">Create Organization</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-32">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-block animate-float">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/70 bg-clip-text text-transparent">
              TaskHub
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed">
            The modern platform for organizing and sharing your team's knowledge.
            <span className="block mt-2 text-lg md:text-xl opacity-80">
              Simple, secure, and built for productivity.
            </span>
          </p>
          
          {/* Organization Access Form */}
          <form onSubmit={handleAccess} className="max-w-md mx-auto mb-12 px-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter organization code"
                value={organizationCode}
                onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
                className="text-center h-12 text-lg"
                maxLength={6}
                pattern="[A-Z0-9]{6}"
              />
              <Button 
                type="submit" 
                disabled={loading} 
                className="h-12 text-base font-medium bg-primary hover:bg-primary/90"
              >
                <Lock className="h-4 w-4 mr-2" />
                {loading ? 'Checking...' : 'Access Docs'}
              </Button>
            </div>
          </form>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 mb-24">
          <FeatureCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Smart Documentation"
            description="Create and organize guides with intelligent categorization and rich text editing. Support for markdown, code blocks, and media."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Team Collaboration"
            description="Work together seamlessly with role-based access control. Admins can manage content while team members can easily access it."
          />
          <FeatureCard
            icon={<Key className="h-6 w-6" />}
            title="Simple Access"
            description="Share documentation instantly with your team using a unique organization code. No need for individual accounts."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Enterprise Security"
            description="Keep your data secure with organization-based access controls and encrypted storage."
          />
          <FeatureCard
            icon={<RefreshCw className="h-6 w-6" />}
            title="Always Up-to-Date"
            description="Real-time updates ensure your team always has access to the latest documentation versions."
          />
          <FeatureCard
            icon={<Share2 className="h-6 w-6" />}
            title="Flexible Sharing"
            description="Share specific guides with external collaborators while keeping sensitive documentation private."
          />
        </div>

        {/* How It Works Section */}
        <div className="max-w-4xl mx-auto mb-32 bg-secondary/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Organizations</h3>
                  <ol className="space-y-3 text-muted-foreground">
                    <li>1. Create an organization account</li>
                    <li>2. Get your unique organization code</li>
                    <li>3. Create and organize documentation</li>
                    <li>4. Share the code with your team</li>
                  </ol>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Team Members</h3>
                  <ol className="space-y-3 text-muted-foreground">
                    <li>1. Enter your organization code</li>
                    <li>2. Access documentation instantly</li>
                    <li>3. No account required</li>
                    <li>4. Always up-to-date content</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Key Features</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li>• Rich text editor with markdown support</li>
                    <li>• Categorize and organize content</li>
                    <li>• Role-based access control</li>
                    <li>• Real-time updates</li>
                    <li>• Secure data storage</li>
                    <li>• Mobile-friendly interface</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto text-center px-4 mb-32">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-10">
            Create your organization's knowledge base in minutes. No credit card required.
          </p>
          <Button 
            asChild 
            size="lg" 
            className="rounded-full h-14 px-8 text-lg font-medium bg-primary hover:bg-primary/90 hover:scale-105 transition-all"
          >
            <Link href="/register">
              Create Your Organization
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <footer className="border-t py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            Built with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by Aaron © {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-8 flex flex-col items-center text-center hover:shadow-lg transition-all hover:-translate-y-1 bg-secondary/20 border-secondary">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}