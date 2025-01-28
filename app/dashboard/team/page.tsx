'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (!userData) return;

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: true });

      if (data) {
        setMembers(data);
      }
      setLoading(false);
    };

    fetchTeam();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Members</h1>
          <p className="text-muted-foreground">Manage your organization's team members</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Loading team members...</div>
      ) : (
        <div className="grid gap-6">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {member.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{member.email}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}