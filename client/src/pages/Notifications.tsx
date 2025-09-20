import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Mail, 
  User, 
  Calendar, 
  CheckCheck, 
  Eye,
  Settings,
  Filter,
  MoreVertical
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
  createdBy?: string;
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: "Notification marked as read" });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = (notifications as Notification[]).filter((n: Notification) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((n: Notification) => 
          fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: "All notifications marked as read" });
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'patient_added':
        return <User className="w-4 h-4 text-green-600" />;
      case 'patient_updated':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'file_uploaded':
        return <Mail className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'patient_added':
        return 'bg-green-100 text-green-800';
      case 'patient_updated':
        return 'bg-blue-100 text-blue-800';
      case 'file_uploaded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate to relevant page based on type
    if (notification.relatedId) {
      switch (notification.type) {
        case 'patient_added':
        case 'patient_updated':
          setLocation(`/patients/${notification.relatedId}`);
          break;
      }
    }
  };

  const filteredNotifications = (notifications as Notification[]).filter((notification: Notification) => {
    if (filter === "unread") return !notification.isRead;
    if (filter === "read") return notification.isRead;
    return true;
  });

  const unreadCount = (notifications as Notification[]).filter((n: Notification) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <span>Notifications</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Stay updated with your clinic activities
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1">
              {unreadCount} unread
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40" data-testid="select-notification-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/settings')}
              data-testid="button-notification-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Demo */}
      <Card className="mb-6 border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-900 flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Email Notifications</span>
          </CardTitle>
          <p className="text-sm text-blue-700">
            Email notifications are sent automatically when patients are added or updated
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">Sample Email Preview:</h4>
            <div className="bg-gray-50 p-4 rounded border text-sm">
              <div className="font-bold text-blue-600 text-lg mb-2">My Clinic Portal Notification</div>
              <p className="mb-2">Hello Doctor,</p>
              <p className="mb-3">Patient <strong>John Smith</strong> has been added in the clinic portal.</p>
              <div className="mb-3">
                <span className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                  View Patient Details
                </span>
              </div>
              <p className="text-gray-600">
                Best regards,<br />
                My Clinic Portal Team
              </p>
            </div>
          </div>
          <div className="text-sm text-blue-600 flex items-center space-x-1">
            <Settings className="w-4 h-4" />
            <span>You can enable/disable email notifications in your user settings</span>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {filter === "unread" ? "No unread notifications" : "No notifications to show"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification: Notification) => (
            <Card 
              key={notification.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.isRead ? 'ring-2 ring-blue-100 bg-blue-50/20' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
              data-testid={`notification-item-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getNotificationBadgeColor(notification.type)}`}
                          >
                            {notification.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(notification.createdAt))} ago</span>
                          </span>
                          {notification.isRead && (
                            <span className="flex items-center space-x-1">
                              <CheckCheck className="w-3 h-3" />
                              <span>Read</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.isRead && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Mark as Read
                            </DropdownMenuItem>
                          )}
                          {notification.relatedId && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              <User className="w-4 h-4 mr-2" />
                              View Patient
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}