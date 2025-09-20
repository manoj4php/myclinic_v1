import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserForm from "@/components/UserForm";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import AnalyticsCard from "@/components/AnalyticsCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [changePasswordUser, setChangePasswordUser] = useState<{id: string, name: string} | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = Array.isArray(users) ? users.filter((user: any) => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  }) : [];

  const userStats = Array.isArray(users) ? {
    total: users.length,
    doctors: users.filter((u: any) => u.role === 'user').length,
    admins: users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin').length,
  } : { total: 0, doctors: 0, admins: 0 };

  const roleColors = {
    super_admin: "bg-destructive text-destructive-foreground",
    admin: "bg-chart-2 text-white",
    user: "bg-primary text-primary-foreground",
  };

  const canManageUsers = (currentUser as any)?.role === 'super_admin' || (currentUser as any)?.role === 'admin';

  return (
    <div className="p-6" data-testid="users-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
            {!canManageUsers && (
              <span className="block text-amber-600 text-sm mt-1">
                <i className="fas fa-info-circle mr-1"></i>
                Admin or Super Admin role required to add/edit users
              </span>
            )}
          </p>
        </div>
        {canManageUsers ? (
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2" data-testid="button-add-user">
                <i className="fas fa-plus"></i>
                <span>Add User</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <UserForm 
                onSuccess={() => setShowAddUser(false)}
                onCancel={() => setShowAddUser(false)}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Button 
            className="flex items-center space-x-2" 
            disabled
            title="Requires Admin or Super Admin role"
            data-testid="button-add-user-disabled"
          >
            <i className="fas fa-plus"></i>
            <span>Add User</span>
          </Button>
        )}
      </div>
      
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <AnalyticsCard
          title="Total Users"
          value={userStats.total}
          icon="fa-users"
          color="primary"
        />
        
        <AnalyticsCard
          title="Active Doctors"
          value={userStats.doctors}
          icon="fa-user-md"
          color="chart-1"
        />
        
        <AnalyticsCard
          title="Administrators"
          value={userStats.admins}
          icon="fa-user-shield"
          color="chart-2"
        />
      </div>
      
      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                data-testid="input-search-users"
              />
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48" data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Specialty</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                    {canManageUsers && (
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => {
                    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 
                                    user.email?.[0]?.toUpperCase() || '?';
                    
                    return (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-foreground">{initials}</span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : user.email
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${roleColors[user.role as keyof typeof roleColors] || 'bg-muted text-muted-foreground'}`}>
                            {user.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-foreground capitalize">
                          {user.specialty || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        {canManageUsers && (
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => setChangePasswordUser({
                                  id: user.id,
                                  name: user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}` 
                                    : user.email
                                })}
                              >
                                <i className="fas fa-key"></i>
                              </Button>
                              {user.id !== (currentUser as any)?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-lg font-medium text-foreground mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedRole ? "No users match your current filters." : "No users available."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <UserForm 
              user={editingUser}
              onSuccess={() => setEditingUser(null)}
              onCancel={() => setEditingUser(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Change Password Dialog */}
      {changePasswordUser && (
        <ChangePasswordDialog
          isOpen={!!changePasswordUser}
          onOpenChange={() => setChangePasswordUser(null)}
          userId={changePasswordUser.id}
          userName={changePasswordUser.name}
        />
      )}
    </div>
  );
}
