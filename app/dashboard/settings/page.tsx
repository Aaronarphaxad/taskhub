'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Copy, Check, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Organization {
  id: string;
  name: string;
  unique_code: string;
  allow_guest_write: boolean;
}

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateCodeLoading, setUpdateCodeLoading] = useState(false);
  const [updateNameLoading, setUpdateNameLoading] = useState(false);
  const [updatePermissionsLoading, setUpdatePermissionsLoading] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: membershipData } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', session.user.id)
          .single();

        if (!membershipData || membershipData.role !== 'admin') {
          toast({
            title: 'Access Denied',
            description: 'Only organization admins can access settings',
            variant: 'warning',
          });
          router.push('/dashboard');
          return;
        }

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', membershipData.organization_id)
          .single();

        if (orgData) {
          setOrg(orgData);
          setNewName(orgData.name);
        }
      } catch (error: any) {
        toast({
          title: 'Unable to Load Settings',
          description: 'Please try again later',
          variant: 'warning',
        });
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [router, toast]);

  const handleCopyCode = async () => {
    if (!org) return;
    
    try {
      await navigator.clipboard.writeText(org.unique_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Code Copied',
        description: 'Organization code has been copied to clipboard',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Unable to Copy',
        description: 'Please try copying the code manually',
        variant: 'warning',
      });
    }
  };

  const handleUpdateName = async () => {
    if (!org || !newName || newName === org.name) return;

    try {
      setUpdateNameLoading(true);

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ name: newName })
        .eq('id', org.id);

      if (updateError) throw updateError;

      setOrg({ ...org, name: newName });
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Organization name updated successfully',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to Update Name',
        description: 'Please try again later',
        variant: 'warning',
      });
    } finally {
      setUpdateNameLoading(false);
    }
  };

  const handleUpdateCode = async () => {
    if (!newCode || !org) return;

    try {
      setUpdateCodeLoading(true);

      // Validate code format
      if (!/^[A-Z0-9]{6}$/.test(newCode)) {
        throw new Error('Please use 6 characters with only uppercase letters and numbers');
      }

      // Check if code is already in use
      const { data: existingOrg, error: checkError } = await supabase
        .from('organizations')
        .select('id')
        .eq('unique_code', newCode)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingOrg) {
        throw new Error('This code is already in use');
      }

      // Update the organization code
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ unique_code: newCode })
        .eq('id', org.id);

      if (updateError) throw updateError;

      // Update local state
      setOrg({ ...org, unique_code: newCode });
      setNewCode('');

      toast({
        title: 'Code Updated',
        description: 'Your organization code has been updated successfully',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to Update Code',
        description: error.message,
        variant: 'warning',
      });
    } finally {
      setUpdateCodeLoading(false);
    }
  };

  const handleToggleGuestWrite = async () => {
    if (!org) return;

    try {
      setUpdatePermissionsLoading(true);

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ allow_guest_write: !org.allow_guest_write })
        .eq('id', org.id);

      if (updateError) throw updateError;

      setOrg({ ...org, allow_guest_write: !org.allow_guest_write });

      toast({
        title: 'Permissions Updated',
        description: org.allow_guest_write 
          ? 'Guests can no longer create or edit guides' 
          : 'Guests can now create and edit guides',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to Update Permissions',
        description: 'Please try again later',
        variant: 'warning',
      });
    } finally {
      setUpdatePermissionsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Delete organization membership first
      const { error: membershipError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', session.user.id);

      if (membershipError) throw membershipError;

      // Delete user record
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', session.user.id);

      if (userError) throw userError;

      // Delete the user's auth account
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;

      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted',
        variant: 'default',
      });

      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Unable to Delete Account',
        description: 'Please try again later or contact support if the issue persists',
        variant: 'warning',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading settings...</div>;
  }

  if (!org) {
    return <div className="text-center text-muted-foreground">Organization not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Organization Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              View and manage your organization's information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                {isEditing ? (
                  <>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter organization name"
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpdateName}
                        disabled={updateNameLoading || !newName || newName === org.name}
                        className="w-full sm:w-auto"
                      >
                        {updateNameLoading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setNewName(org.name);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input value={org.name} readOnly className="flex-1" />
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="w-full sm:w-auto"
                    >
                      Edit Name
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organization Code</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={org.unique_code} readOnly className="flex-1" />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyCode}
                    className="w-full sm:w-auto min-w-[100px]"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">Update Code</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] w-full sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Update Organization Code</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div>
                            This will change your organization's access code. Make sure to share the new code with your team members.
                            <div className="mt-4 space-y-2">
                              <Label>New Code</Label>
                              <Input
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                placeholder="Enter new code (6 characters)"
                                maxLength={6}
                                pattern="[A-Z0-9]{6}"
                              />
                              <div className="text-sm text-muted-foreground">
                                Code must be 6 characters long and contain only uppercase letters and numbers.
                              </div>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleUpdateCode}
                          disabled={updateCodeLoading || !newCode || newCode.length !== 6}
                          className="w-full sm:w-auto"
                        >
                          {updateCodeLoading ? 'Updating...' : 'Update Code'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Share this code with team members to let them access your organization's documentation
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guest Permissions</CardTitle>
            <CardDescription>
              Control what guests can do with your organization's documentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="guest-write">Allow Guests to Create and Edit Guides</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, users with your organization code can create new guides and edit existing ones.
                  When disabled, they can only view guides.
                </p>
              </div>
              <Switch
                id="guest-write"
                checked={org?.allow_guest_write || false}
                onCheckedChange={handleToggleGuestWrite}
                disabled={updatePermissionsLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteLoading} className="w-full sm:w-auto">
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[95vw] w-full sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      This action cannot be undone. This will permanently delete your account
                      and all associated data, including:
                      <ul className="list-disc list-inside mt-2">
                        <li>Your organization membership</li>
                        <li>Your user profile</li>
                        <li>Access to all organization content</li>
                      </ul>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be certain.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}