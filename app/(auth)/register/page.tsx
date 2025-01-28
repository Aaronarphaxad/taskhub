'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a unique organization code (6 characters)
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create the organization first
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, unique_code: uniqueCode }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Sign up the user
      const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        // If user creation fails, clean up the organization
        await supabase
          .from('organizations')
          .delete()
          .eq('id', org.id);
        throw authError;
      }

      if (!auth.user) throw new Error('No user data returned');

      // Create organization membership with admin role
      const { error: membershipError } = await supabase
        .from('organization_members')
        .insert([{
          user_id: auth.user.id,
          organization_id: org.id,
          role: 'admin'
        }]);

      if (membershipError) {
        // If membership creation fails, clean up the organization and user
        await supabase
          .from('organizations')
          .delete()
          .eq('id', org.id);
        throw membershipError;
      }

      setRegistered(true);
      toast({
        title: 'Registration successful!',
        description: 'Please check your email to confirm your account. Your organization code is: ' + uniqueCode,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            asChild
            className="mb-6"
          >
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                We've sent you a confirmation email. Please click the link in the email to verify your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you confirm your email, you can sign in to access your organization's documentation.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try signing in to resend the confirmation email.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Sign In</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          asChild
          className="mb-6"
        >
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Register Organization</CardTitle>
            <CardDescription>Create a new organization and admin account</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  You'll need to confirm this email address before accessing your account.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Organization...' : 'Create Organization'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}