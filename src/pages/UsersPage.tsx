import React from 'react';
import { Users, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { db, updateDoc, doc, serverTimestamp } from '@/lib/firebase';
import { UserRole, UserStatus } from '@/types/inventory';
import { toDate, formatDate } from '@/lib/firebase';

export const UsersPage: React.FC = () => {
  const { users, refreshData } = useInventory();
  const { toast } = useToast();

  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status, updatedAt: serverTimestamp() });
      toast({ title: 'Success', description: `User ${status.toLowerCase()}` });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role, updatedAt: serverTimestamp() });
      toast({ title: 'Success', description: 'Role updated' });
      await refreshData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Users className="h-7 w-7" />
          User Management
        </h1>
        <p className="text-muted-foreground">Manage user access and roles</p>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-warning">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-warning mb-4">Pending Approval ({pendingUsers.length})</h3>
            <div className="space-y-3">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleUpdateStatus(user.id, 'APPROVED')}>
                      <Check className="h-4 w-4 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(user.id, 'REJECTED')}>
                      <X className="h-4 w-4 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">All Users ({approvedUsers.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">User</th>
                  <th className="text-left py-3 px-2 font-medium">Email</th>
                  <th className="text-left py-3 px-2 font-medium">Role</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map(user => (
                  <tr key={user.id} className="border-b">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.displayName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-2">
                      <Select value={user.role} onValueChange={(v: UserRole) => handleUpdateRole(user.id, v)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPERADMIN">SuperAdmin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={user.status === 'APPROVED' ? 'default' : 'secondary'}>{user.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{formatDate(toDate(user.lastLoginAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
