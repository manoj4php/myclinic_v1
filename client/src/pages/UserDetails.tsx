import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserForm from "@/components/UserForm";
import { ArrowLeft, Mail, Phone, MapPin, User, Calendar, UserCheck, Building } from "lucide-react";

export default function UserDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Fetch user details
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto" data-testid="user-details-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center" data-testid="user-not-found">
        <div className="py-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/users")} data-testid="button-back-to-users">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const roleColors = {
    super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    user: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  };

  const specialtyColors = {
    radiology: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    pediatric: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    gynac: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    medicines: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    surgeon: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const initials = `${(user as any).firstName?.[0] || ''}${(user as any).lastName?.[0] || ''}` || 
                  (user as any).email?.[0]?.toUpperCase() || '?';

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 min-h-screen" data-testid="user-details-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/users")}
            data-testid="button-back-users"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-user-name">
                {(user as any).firstName || (user as any).lastName 
                  ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim()
                  : (user as any).email
                }
              </h1>
              <p className="text-muted-foreground">User ID: {(user as any).id.slice(-8)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge 
            className={`${roleColors[(user as any).role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}`}
            data-testid="badge-role"
          >
            {(user as any).role?.replace('_', ' ').toUpperCase()}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-edit-user">
                Edit User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <UserForm 
                user={user} 
                onSuccess={() => {
                  // Dialog will close automatically
                  window.location.reload(); // Refresh to show updated data
                }}
                onCancel={() => {
                  // Dialog will close automatically
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3" data-testid="info-email">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{(user as any).email}</p>
                </div>
              </div>

              {(user as any).phone && (
                <div className="flex items-center space-x-3" data-testid="info-phone">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{(user as any).phone}</p>
                  </div>
                </div>
              )}

              {(user as any).address && (
                <div className="flex items-center space-x-3" data-testid="info-address">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{(user as any).address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3" data-testid="info-status">
                <UserCheck className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <Badge className={`${(user as any).isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {(user as any).isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <Building className="w-5 h-5 mr-2" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3" data-testid="info-role">
                <UserCheck className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{(user as any).role?.replace('_', ' ')}</p>
                </div>
              </div>

              {(user as any).specialty && (
                <div className="flex items-center space-x-3" data-testid="info-specialty">
                  <Building className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Specialty</p>
                    <Badge 
                      className={`${specialtyColors[(user as any).specialty as keyof typeof specialtyColors] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {(user as any).specialty.charAt(0).toUpperCase() + (user as any).specialty.slice(1)}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3" data-testid="info-created">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Created</p>
                  <p className="font-medium">
                    {new Date((user as any).createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3" data-testid="info-notifications">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email Notifications</p>
                  <Badge className={`${(user as any).emailNotifications ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {(user as any).emailNotifications ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}