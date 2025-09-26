import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, Menu } from "lucide-react";
import type { User, Notification } from "@/types";
import { ClinicLogo, ClinicLogoText } from "@/components/Logo";
import { logout } from "@/lib/authUtils";

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  requiredRole?: string;
}

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: "fa-chart-pie" },
  { path: "/patients", label: "Patients", icon: "fa-users" },
  { path: "/add-patient", label: "Add Patient", icon: "fa-user-plus" },
  { path: "/notifications", label: "Notifications", icon: "fa-bell" },
  { path: "/reports", label: "Medical Reports", icon: "fa-file-medical" },
  { path: "/analytics", label: "Analytics", icon: "fa-chart-bar" },
  { path: "/users", label: "User Management", icon: "fa-user-cog" },
  { path: "/settings", label: "Settings", icon: "fa-cog" },
  { path: "/seo-settings", label: "SEO Settings", icon: "fa-search", requiredRole: "super_admin" },
];

// Create sidebar context
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebar();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadNotifications = notifications?.filter((n: Notification) => !n.isRead)?.length || 0;

  const handleLogout = async () => {
    // Use the centralized logout function which handles all cleanup
    await logout();
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    // Close mobile sidebar after navigation
    if (isMobile && isMobileOpen) {
      setMobileOpen(false);
    }
  };

  const getDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user?.email || 'User';
  };

  const getRoleDisplay = () => {
    const role = user?.role?.replace('_', ' ') || 'User';
    const specialty = user?.specialty;
    return specialty ? `${role} - ${specialty}` : role;
  };

  const getUserInitials = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  // Mobile overlay
  const mobileOverlay = isMobile && isMobileOpen && (
    <div 
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setMobileOpen(false)}
    />
  );

  return (
    <>
      {mobileOverlay}
      <div className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 flex flex-col z-50 ${
        isMobile 
          ? `${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `${isCollapsed ? 'w-16' : 'w-64'}`
      }`}>
        {/* Header with logo and toggle */}
        <div className={`border-b border-border transition-all duration-300 flex-shrink-0 ${
          isCollapsed && !isMobile ? 'p-3' : 'p-4'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`flex ${isCollapsed && !isMobile ? 'justify-center' : 'flex-col space-y-1'}`}>
              {isCollapsed && !isMobile ? (
                <ClinicLogo size="sm" />
              ) : (
                <>
                  <ClinicLogoText size="sm" />
                  <p className="text-xs text-muted-foreground capitalize ml-12">{getRoleDisplay()}</p>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`transition-transform duration-300 hover:bg-muted ${
                isCollapsed && !isMobile ? 'rotate-180' : ''
              }`}
              data-testid="button-toggle-sidebar"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <nav className={`space-y-1 ${isCollapsed && !isMobile ? 'p-2' : 'p-3'}`}>
              {navigationItems.map((item) => {
                // Skip items that require specific roles if user doesn't have them
                if (item.requiredRole && user?.role !== item.requiredRole) {
                  return null;
                }
                
                const isActive = location === item.path;
                const showNotificationBadge = item.path === "/notifications" && unreadNotifications > 0;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center rounded-md transition-all duration-200 relative ${
                      isCollapsed && !isMobile
                        ? 'px-3 py-3 justify-center' 
                        : 'space-x-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-foreground hover:shadow-sm"
                    }`}
                    data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
                    title={isCollapsed && !isMobile ? item.label : undefined}
                    aria-label={item.label}
                  >
                    <i className={`fas ${item.icon} ${isCollapsed && !isMobile ? 'text-sm' : 'text-sm'}`}></i>
                    {(!isCollapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
                    {showNotificationBadge && (
                      <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center animate-pulse">
                        {unreadNotifications}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
        
        {/* Fixed bottom user section */}
        <div className={`border-t border-border transition-all duration-300 flex-shrink-0 ${
          isCollapsed && !isMobile ? 'p-2' : 'p-3'
        }`}>
          <div className={`flex items-center bg-muted/50 rounded-md p-2.5 transition-all duration-200 hover:bg-muted ${
            isCollapsed && !isMobile ? 'flex-col space-y-2' : 'space-x-3'
          }`}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary-foreground">{getUserInitials()}</span>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex-shrink-0"
              data-testid="button-logout"
              title={isCollapsed && !isMobile ? 'Logout' : undefined}
              aria-label="Logout"
            >
              <i className="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
