import { queryClient } from "./queryClient";

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Centralized logout utility that handles all aspects of user logout
 * including localStorage cleanup, query cache clearing, and redirection
 */
export async function logout(): Promise<void> {
  try {
    // Call server logout endpoint if it exists (optional)
    try {
      const token = localStorage.getItem("jwtToken");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
    } catch (error) {
      // Server logout failed, but continue with client cleanup
      console.warn("Server logout failed, continuing with client cleanup:", error);
    }

    // Clear all localStorage data
    localStorage.removeItem("jwtToken");
    
    // Clear any other potential auth-related localStorage items
    const keysToRemove = [
      "user",
      "authToken", 
      "refreshToken",
      "userPreferences",
      "sessionData"
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage as well
    sessionStorage.clear();

    // Clear all React Query cache
    queryClient.clear();

    // Reset React Query client to ensure clean state
    queryClient.resetQueries();

    // Optional: Clear any other state management stores if using Redux, Zustand, etc.
    // store.dispatch(resetState());

    console.log("Logout completed successfully");

  } catch (error) {
    console.error("Error during logout:", error);
  } finally {
    // Always redirect to login page regardless of cleanup success
    // Use window.location.href for full page refresh to ensure clean state
    window.location.href = "/";
  }
}

/**
 * Logout with user confirmation
 * Shows a confirmation dialog before logging out
 */
export async function logoutWithConfirmation(): Promise<void> {
  const confirmed = window.confirm("Are you sure you want to logout?");
  if (confirmed) {
    await logout();
  }
}

/**
 * Force logout (used when token is expired or invalid)
 * Skips confirmation and performs immediate logout
 */
export async function forceLogout(reason?: string): Promise<void> {
  if (reason) {
    console.warn(`Force logout: ${reason}`);
  }
  await logout();
}