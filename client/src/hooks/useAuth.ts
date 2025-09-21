import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
        // If unauthorized, clear the token and return null
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          localStorage.removeItem("jwtToken");
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
