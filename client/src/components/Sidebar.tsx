import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState, createContext, useContext, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Menu } from "lucide-react";
import type { User, Notification } from "@/types";
import { ClinicLogo, ClinicLogoText } from "@/components/Logo";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: "fa-chart-pie" },
  { path: "/patients", label: "Patients", icon: "fa-users" },
  { path: "/add-patient", label: "Add Patient", icon: "fa-user-plus" },
  { path: "/notifications", label: "Notifications", icon: "fa-bell" },
  { path: "/reports", label: "Medical Reports", icon: "fa-file-medical" },
  { path: "/analytics", label: "Analytics", icon: "fa-chart-bar" },
  { path: "/users", label: "User Management", icon: "fa-user-cog" },
  { path: "/settings", label: "Settings", icon: "fa-cog" },
];

// Create sidebar context
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
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
  const { isCollapsed, toggleSidebar } = useSidebar();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadNotifications = notifications?.filter((n: Notification) => !n.isRead)?.length || 0;

  const handleLogout = () => {
    window.location.href = "/api/logout";
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

  return (
    <div className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className={`border-b border-border transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex ${isCollapsed ? 'justify-center' : 'flex-col space-y-1'}`}>
            {isCollapsed ? (
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
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            data-testid="button-toggle-sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          const showNotificationBadge = item.path === "/notifications" && unreadNotifications > 0;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center rounded-md transition-colors relative ${
                isCollapsed 
                  ? 'px-3 py-3 justify-center' 
                  : 'space-x-3 px-4 py-3'
              } ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
              data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
              title={isCollapsed ? item.label : undefined}
            >
              <i className={`fas ${item.icon}`}></i>
              {!isCollapsed && <span>{item.label}</span>}
              {showNotificationBadge && (
                <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {unreadNotifications}
                </div>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className={`absolute bottom-4 transition-all duration-300 ${isCollapsed ? 'left-2 right-2' : 'left-4 right-4'}`}>
        <div className={`flex items-center bg-muted rounded-md p-3 ${isCollapsed ? 'flex-col space-y-2' : 'space-x-3'}`}>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-primary-foreground">{getUserInitials()}</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
