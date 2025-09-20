import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import NotificationDropdown from "@/components/NotificationDropdown";

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

  const pageInfo = pageTitles[location] || { title: "Dashboard", subtitle: "Welcome back" };
  
  const getDisplayName = () => {
    if (user && typeof user === 'object' && ('firstName' in user || 'lastName' in user)) {
      const firstName = (user as any).firstName || '';
      const lastName = (user as any).lastName || '';
      return `${firstName} ${lastName}`.trim();
    }
    return (user as any)?.email || 'User';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pageInfo.title}</h1>
          <p className="text-sm text-muted-foreground">
            {pageInfo.subtitle}, {getDisplayName()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationDropdown />
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <i className="fas fa-calendar"></i>
            <span data-testid="current-date">{currentDate}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <i className="fas fa-clock"></i>
            <span data-testid="current-time">{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
