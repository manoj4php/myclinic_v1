import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';
import { forceLogout } from '@/lib/authUtils';

interface ActiveSession {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}

export function useSessionMonitoring() {
  const { user, isAuthenticated } = useAuth();
  const [showConcurrentDialog, setShowConcurrentDialog] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  // Monitor active sessions every 30 seconds when authenticated
  const { data: sessionData } = useQuery({
    queryKey: ['/api/auth/active-sessions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/active-sessions');
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  // Check for concurrent sessions
  useEffect(() => {
    if (sessionData?.activeSessions && sessionData.activeSessions.length > 1) {
      // If more than one session is active, show warning
      setActiveSessions(sessionData.activeSessions);
      setShowConcurrentDialog(true);
    }
  }, [sessionData]);

  const handleForceLogin = async () => {
    try {
      await apiRequest('POST', '/api/auth/force-login', {});
      setShowConcurrentDialog(false);
      // Force re-authentication
      await forceLogout('Sessions invalidated. Please log in again.');
    } catch (error) {
      console.error('Failed to force login:', error);
    }
  };

  const closeConcurrentDialog = () => {
    setShowConcurrentDialog(false);
    // Optionally log out the current user
    forceLogout('Multiple sessions detected. Please log in again.');
  };

  return {
    showConcurrentDialog,
    activeSessions,
    handleForceLogin,
    closeConcurrentDialog,
    userEmail: user?.email || '',
  };
}