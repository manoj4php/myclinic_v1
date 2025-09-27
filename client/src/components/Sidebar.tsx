import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, Menu } from "lucide-react";
import type { User, Notification } from "@/types";
import { ClinicLogo, ClinicLogoText } from "@/components/Logo";
import { logout } from "@/lib/authUtils";
import { SidebarMenu } from "../types/permissions";

interface NavigationItem {
  path: string;
  label: string;
  icon?: string; // Make icon optional
  key: SidebarMenu;
}

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: "fa-chart-pie", key: "dashboard" },
  { path: "/patients", label: "Patients", icon: "fa-users", key: "patients" },
  { path: "/add-patient", label: "Add Patient", icon: "fa-user-plus", key: "patients" },
  { path: "/notifications", label: "Notifications", icon: "fa-bell", key: "notifications" },
  { path: "/reports", label: "Medical Reports", icon: "fa-file-medical", key: "reports" },
  { path: "/analytics", label: "Analytics", icon: "fa-chart-bar", key: "analytics" },
  { path: "/users", label: "User Management", icon: "fa-user-cog", key: "user-management" },
  { path: "/settings", label: "Settings", icon: "fa-cog", key: "settings" },
  { path: "/seo-settings", label: "SEO Settings", icon: "fa-cog", key: "seo-settings" },
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
  const { canAccessSidebarMenu, getAllowedSidebarMenus } = usePermissions();
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

  // Helper function to get the first letter of a menu item
  const getMenuLetter = (label: string) => {
    // For multi-word labels, take first letter of each word (max 2 letters)
    const words = label.split(' ');
    if (words.length > 1) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return label.charAt(0).toUpperCase();
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
      <div className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col z-50 ${
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className={`transition-transform duration-300 hover:bg-muted ${
                    isCollapsed && !isMobile ? 'rotate-180' : ''
                  }`}
                  data-testid="button-toggle-sidebar"
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-medium">
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <nav className={`space-y-1 ${isCollapsed && !isMobile ? 'p-2' : 'p-3'}`}>
              {navigationItems
                .filter((item) => canAccessSidebarMenu(item.key))
                .map((item) => {
                  const isActive = location === item.path;
                const showNotificationBadge = item.path === "/notifications" && unreadNotifications > 0;
                
                const navigationButton = (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center rounded-md transition-all duration-300 relative group ${
                      isCollapsed && !isMobile
                        ? 'px-3 py-3 justify-center min-w-[2.75rem]' 
                        : 'gap-3 px-3 py-2.5 justify-start'
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-foreground hover:shadow-sm hover:scale-105"
                    }`}
                    data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
                    aria-label={item.label}
                  >
                    {isCollapsed && !isMobile ? (
                      // Show first letter when collapsed
                      <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-200 font-bold text-center w-8 h-8 text-xs rounded-md ${
                        isActive 
                          ? 'bg-primary-foreground text-primary shadow-sm' 
                          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                      }`}>
                        {getMenuLetter(item.label)}
                      </div>
                    ) : (
                      // Show icon when expanded (or use first letter as fallback)
                      item.icon ? (
                        <i className={`fas ${item.icon} flex items-center justify-center flex-shrink-0 transition-all duration-200 text-sm w-5 h-5`}></i>
                      ) : (
                        <div className="flex items-center justify-center flex-shrink-0 transition-all duration-200 font-bold text-center w-5 h-5 text-sm">
                          {getMenuLetter(item.label)}
                        </div>
                      )
                    )}
                    {(!isCollapsed || isMobile) && (
                      <span className="text-sm font-medium truncate transition-opacity duration-300">
                        {item.label}
                      </span>
                    )}
                    {showNotificationBadge && (
                      <div className={`absolute bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center animate-pulse transition-all duration-300 ${
                        isCollapsed && !isMobile ? 'top-0 right-0 -translate-y-1 translate-x-1' : 'top-1 right-1'
                      }`}>
                        {unreadNotifications}
                      </div>
                    )}
                  </button>
                );

                // Wrap with tooltip only when collapsed
                return isCollapsed && !isMobile ? (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      {navigationButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                      {showNotificationBadge && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {unreadNotifications} unread
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : navigationButton;
              })}
            </nav>
          </ScrollArea>
        </div>
        
        {/* Fixed bottom user section */}
        <div className={`border-t border-border transition-all duration-300 flex-shrink-0 ${
          isCollapsed && !isMobile ? 'p-2' : 'p-3'
        }`}>
          <div className={`flex items-center bg-muted/50 rounded-md p-2.5 transition-all duration-200 hover:bg-muted ${
            isCollapsed && !isMobile ? 'flex-col gap-2' : 'gap-3'
          }`}>
            {isCollapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                    <span className="text-xs font-medium text-primary-foreground">{getUserInitials()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  <div className="text-center">
                    <p>{getDisplayName()}</p>
                    <p className="text-xs opacity-75">{getRoleDisplay()}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary-foreground">{getUserInitials()}</span>
              </div>
            )}
            
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            )}
            
            {isCollapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex-shrink-0 p-1"
                    data-testid="button-logout"
                    aria-label="Logout"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Logout
                </TooltipContent>
              </Tooltip>
            ) : (
              <button 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex-shrink-0"
                data-testid="button-logout"
                aria-label="Logout"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
