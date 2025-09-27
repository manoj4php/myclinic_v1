import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  User, 
  Calendar, 
  Eye,
  Settings,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

export default function NotificationDropdown() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('PUT', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'patient_added':
      case 'patient_updated':
        return <User className="w-3 h-3 text-blue-600" />;
      default:
        return <Bell className="w-3 h-3 text-gray-600" />;
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
    setIsOpen(false);
  };

  const unreadNotifications = (notifications as Notification[]).filter((n: Notification) => !n.isRead);
  const displayNotifications = unreadNotifications.slice(0, 5); // Show only unread, limit to 5

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="button-notifications-dropdown"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadNotifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadNotifications.length} new
            </Badge>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="max-h-80">
          {displayNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No unread notifications
            </div>
          ) : (
            displayNotifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-3 cursor-pointer focus:bg-gray-50 bg-blue-50/50"
                onClick={() => handleNotificationClick(notification)}
                data-testid={`dropdown-notification-${notification.id}`}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium truncate text-gray-900">
                        {notification.title}
                      </p>
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                    </div>
                    
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(notification.createdAt))} ago
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-center justify-center"
          onClick={() => {
            setLocation('/notifications');
            setIsOpen(false);
          }}
          data-testid="dropdown-view-all-notifications"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View All Notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}