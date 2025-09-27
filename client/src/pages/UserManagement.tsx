import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { exportToExcel } from "@/lib/exportUtils";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UserForm from "@/components/UserForm";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import AnalyticsCard from "@/components/AnalyticsCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { DataTablePagination } from "@/components/DataTablePagination";
import { 
  Download, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Key, 
  User, 
  Calendar,
  UserCheck,
  Shield,
  Mail,
  Phone,
  MapPin,
  FileText
} from "lucide-react";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [changePasswordUser, setChangePasswordUser] = useState<{id: string, name: string} | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["/api/users", { 
      page: currentPage, 
      limit: itemsPerPage, 
      search: searchQuery || undefined,
      role: selectedRole || undefined 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedRole && selectedRole !== "all") params.append('role', selectedRole);
      
      const response = await apiRequest("GET", `/api/users?${params.toString()}`);
      return await response.json();
    },
  });

  const users = usersResponse?.data || [];
  const pagination = usersResponse?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset page when filters change
  const handleSearchChange = (newSearchQuery: string) => {
    setSearchQuery(newSearchQuery);
    setCurrentPage(1);
  };

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setCurrentPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!usersResponse?.data?.length) return;
    
    // Prepare data for export
    const exportData = usersResponse.data.map((user: any) => ({
      'User ID': user.id,
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
      'Specialty': user.specialty || 'N/A',
      'Status': user.isActive ? 'Active' : 'Inactive',
      'Last Login Date': user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
      'Last Login Time': user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'N/A',
      'Created Date': new Date(user.createdAt).toLocaleDateString(),
      'Last Updated': new Date(user.updatedAt).toLocaleDateString()
    }));

    exportToExcel({
      data: exportData,
      filename: `users-list-${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Users',
      dateFields: ['Last Login Date', 'Created Date', 'Last Updated']
    });
  };

  // Since filtering is now handled by backend, we use the returned users directly
  const filteredUsers = users;

  const userStats = {
    total: pagination.total,
    doctors: Array.isArray(users) ? users.filter((u: any) => u.role === 'user').length : 0,
    technicians: Array.isArray(users) ? users.filter((u: any) => u.role === 'technician').length : 0,
    admins: Array.isArray(users) ? users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin').length : 0,
  };

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

  const roleColors = {
    super_admin: "bg-destructive text-destructive-foreground",
    admin: "bg-chart-2 text-white",
    user: "bg-primary text-primary-foreground",
  };

  const canManageUsers = (currentUser as any)?.role === 'super_admin' || (currentUser as any)?.role === 'admin';

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user: any) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) {
      // Handle bulk delete
      toast({
        title: "Success",
        description: `${selectedUsers.length} users deleted successfully`,
      });
      setSelectedUsers([]);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50/50 to-white min-h-screen" data-testid="users-view">
      {/* Header Section */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">User Management</h1>
            </div>
            <div className="text-xs text-gray-600">
              System Users & Access Control Management
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>Total: {pagination.total || 0} users</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Today: {new Date().toLocaleDateString()}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 px-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-8 px-2"
                    data-testid="button-export-users"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export to Excel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canManageUsers && (
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-xs"
                    data-testid="button-add-user"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    <span>New User</span>
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
            )}
          </div>
        </div>
      </div>
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
          title="Active Technicians"
          value={userStats.technicians}
          icon="fa-user-cog"
          color="chart-3"
        />
        
        <AnalyticsCard
          title="Administrators"
          value={userStats.admins}
          icon="fa-user-shield"
          color="chart-2"
        />
      </div>

      {/* Advanced Filter Section */}
      <Card className="mb-4 border-blue-100 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-8 text-sm"
                data-testid="input-search-users"
              />
            </div>
            
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger data-testid="select-role" className="h-8 text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Doctor</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger data-testid="select-status" className="h-8 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                handleSearchChange("");
                handleRoleChange("all");
                handleStatusChange("all");
              }}
            >
              <Filter className="w-3 h-3 mr-1" />
              <span>Clear</span>
            </Button>

            {selectedUsers.length > 0 && canManageUsers && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                <span>Delete ({selectedUsers.length})</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {/* User Management Table */}
      <Card className="shadow-md border-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-t-lg">
          <h2 className="text-sm font-semibold flex items-center space-x-2">
            <UserCheck className="w-4 h-4" />
            <span>System Users & Access Control</span>
          </h2>
        </div>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/6"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-blue-50">
                  <TableRow className="border-blue-100 h-10">
                    <TableHead className="w-10 py-2">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers?.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                        className="w-4 h-4"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Actions</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">User Name</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">User Full Name</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Qualification</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Email</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Telephone No</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Mobile No</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Is Approved</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Creation Date</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Last Login Date</TableHead>
                    <TableHead className="font-semibold text-blue-900 text-xs py-2">Role Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length > 0 ? (
                    filteredUsers.map((user: any, index: number) => {
                      const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 
                                      user.email?.[0]?.toUpperCase() || '?';
                      
                      return (
                        <TableRow 
                          key={user.id} 
                          className={`
                            hover:bg-blue-50/50 transition-colors cursor-pointer h-10
                            ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}
                            ${index % 2 === 0 ? 'bg-gray-50/30' : ''}
                          `}
                          onClick={() => setLocation(`/users/${user.id}`)}
                          data-testid={`user-row-${user.id}`}
                        >
                          <TableCell className="py-1">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-user-${user.id}`}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          
                          <TableCell className="px-1 py-1">
                            <div className="flex items-center space-x-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/users/${user.id}`);
                                }}
                                data-testid={`button-view-${user.id}`}
                                title="View User Details"
                                className="h-6 w-6 p-0"
                              >
                                <Eye className="w-3 h-3 text-blue-600" />
                              </Button>
                              
                              {canManageUsers && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingUser(user);
                                    }}
                                    data-testid={`button-edit-${user.id}`}
                                    title="Edit User"
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3 text-green-600" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChangePasswordUser({
                                        id: user.id,
                                        name: user.firstName && user.lastName 
                                          ? `${user.firstName} ${user.lastName}` 
                                          : user.email
                                      });
                                    }}
                                    title="Change Password"
                                    className="h-6 w-6 p-0"
                                  >
                                    <Key className="w-3 h-3 text-orange-600" />
                                  </Button>
                                  
                                  {user.id !== (currentUser as any)?.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteUserMutation.mutate(user.id);
                                      }}
                                      disabled={deleteUserMutation.isPending}
                                      data-testid={`button-delete-${user.id}`}
                                      title="Delete User"
                                      className="h-6 w-6 p-0"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-700">{initials}</span>
                              </div>
                              <div className="font-mono text-xs text-blue-600">
                                {user.firstName || user.email?.split('@')[0] || 'N/A'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="font-semibold text-gray-900 text-sm" data-testid={`text-user-name-${user.id}`}>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email
                              }
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs text-gray-600">
                              {user.qualification || 'Not specified'}
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs text-gray-600 flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs text-gray-600 flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{user.telephone || 'Not provided'}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs text-gray-600 flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone || user.mobile || 'Not provided'}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <Badge 
                              className={`${
                                user.isActive 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              } text-xs px-1 py-0`}
                            >
                              {user.isActive ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs">
                              <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
                              <div className="text-gray-500">{new Date(user.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <div className="text-xs text-gray-600">
                              {user.lastLoginAt ? (
                                <div>
                                  <div className="font-medium">{new Date(user.lastLoginAt).toLocaleDateString()}</div>
                                  <div className="text-gray-500">{new Date(user.lastLoginAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                                </div>
                              ) : (
                                'Never'
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-1">
                            <Badge 
                              className={`${roleColors[user.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'} capitalize text-xs px-1 py-0`}
                            >
                              {user.role?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2 text-gray-500">
                          <UserCheck className="w-8 h-8" />
                          <div className="text-base font-medium">No users found</div>
                          <div className="text-xs">Try adjusting your search filters or add a new user</div>
                          {canManageUsers && (
                            <Button 
                              onClick={() => setShowAddUser(true)}
                              className="mt-4"
                              data-testid="button-add-first-user"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add First User
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        <DataTablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
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
