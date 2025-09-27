import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Monitor, 
  MapPin, 
  Clock,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ActiveSession {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}

interface ConcurrentSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: ActiveSession[];
  onForceLogin: () => void;
  userEmail: string;
}

export function ConcurrentSessionDialog({
  isOpen,
  onClose,
  activeSessions,
  onForceLogin,
  userEmail
}: ConcurrentSessionDialogProps) {
  const { toast } = useToast();

  // Show toast notification when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      toast({
        title: "Concurrent Session Detected",
        description: "User already logged in from another device",
        variant: "destructive",
      });
    }
  }, [isOpen, toast]);

  const handleForceLogin = async () => {
    try {
      await apiRequest("POST", "/api/auth/force-login", {});
      onForceLogin();
      toast({
        title: "Sessions Invalidated",
        description: "All other sessions have been logged out. You can now log in.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invalidate other sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Multiple Sessions
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            <strong>{userEmail}</strong> is active elsewhere
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-amber-700">
                Only one session allowed for security
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Monitor className="w-3 h-3" />
              <span>Active Sessions ({activeSessions.length})</span>
            </h4>
            
            <div className="max-h-20 overflow-y-auto space-y-1">
              {activeSessions.map((session, index) => (
                <div key={session.id} className="border rounded-md p-2 bg-gray-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">Session {index + 1}</span>
                    <span className="text-gray-500">{session.ipAddress}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatLastActivity(session.lastActivity)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              size="sm"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleForceLogin}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Force Login
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}