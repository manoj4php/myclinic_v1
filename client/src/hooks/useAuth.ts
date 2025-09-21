import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { forceLogout } from "@/lib/authUtils";
import type { User } from "@/types";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          return null;
        }
        
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error: any) {
        // If unauthorized, use the centralized force logout
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          await forceLogout('Session expired or invalid token');
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
