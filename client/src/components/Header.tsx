import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationDropdown from "@/components/NotificationDropdown";
import { logout } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Welcome back" },
  "/patients": { title: "Patient Management", subtitle: "Manage all patient records" },
  "/add-patient": { title: "Add New Patient", subtitle: "Enter patient information" },
  "/reports": { title: "Medical Reports", subtitle: "View and generate reports" },
  "/analytics": { title: "Analytics", subtitle: "Detailed insights and metrics" },
  "/users": { title: "User Management", subtitle: "Manage user accounts and roles" },
  "/settings": { title: "Settings", subtitle: "Account and system preferences" },
  "/notifications": { title: "Notifications", subtitle: "Stay updated with clinic activities" },
};

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  const pageInfo = pageTitles[location] || { title: "Dashboard", subtitle: "Welcome back" };
  
  const getDisplayName = () => {
    if (user && typeof user === 'object' && ('firstName' in user || 'lastName' in user)) {
      const firstName = (user as any).firstName || '';
      const lastName = (user as any).lastName || '';
      return `${firstName} ${lastName}`.trim();
    }
    return (user as any)?.email || 'User';
  };

  const getFormattedDate = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const day = now.getDate();
    const year = now.getFullYear();
    return `${dayName} ${month} ${day}, ${year}`;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-card border-b border-border px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="md:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{pageInfo.title}</h1>
            <p className="text-sm text-muted-foreground">
              {pageInfo.subtitle}, {getDisplayName()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <NotificationDropdown />
          
          {/* Welcome message with logout - hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-3 text-sm">
            <span className="text-foreground">
              Welcome {getDisplayName()}, today is {getFormattedDate()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="header-logout-button"
            >
              Logout
            </Button>
          </div>
          
          {/* Mobile logout button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="header-logout-button-mobile"
              title="Logout"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
