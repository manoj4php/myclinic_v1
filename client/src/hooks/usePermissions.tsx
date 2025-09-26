import React from 'react';
import { useAuth } from './useAuth';
import { 
  Role, 
  SidebarMenu, 
  Module, 
  ModuleAction, 
  PermissionService,
  ProtectedRoute,
  PROTECTED_ROUTES 
} from '../types/permissions';

export interface UsePermissionsReturn {
  userRole: Role | null;
  canAccessSidebarMenu: (menu: SidebarMenu) => boolean;
  canPerformAction: (module: Module, action: ModuleAction) => boolean;
  hasModuleAccess: (module: Module) => boolean;
  getAllowedSidebarMenus: () => SidebarMenu[];
  getAllowedActions: (module: Module) => ModuleAction[];
  canAccessRoute: (path: string) => boolean;
  isLoading: boolean;
}

/**
 * Custom hook for managing role-based permissions
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user, isLoading } = useAuth();
  
  const userRole = user?.role as Role || null;

  const canAccessSidebarMenu = (menu: SidebarMenu): boolean => {
    if (!userRole) return false;
    return PermissionService.canAccessSidebarMenu(userRole, menu);
  };

  const canPerformAction = (module: Module, action: ModuleAction): boolean => {
    if (!userRole) return false;
    return PermissionService.canPerformAction(userRole, module, action);
  };

  const hasModuleAccess = (module: Module): boolean => {
    if (!userRole) return false;
    return PermissionService.hasModuleAccess(userRole, module);
  };

  const getAllowedSidebarMenus = (): SidebarMenu[] => {
    if (!userRole) return [];
    return PermissionService.getAllowedSidebarMenus(userRole);
  };

  const getAllowedActions = (module: Module): ModuleAction[] => {
    if (!userRole) return [];
    return PermissionService.getAllowedActions(userRole, module);
  };

  const canAccessRoute = (path: string): boolean => {
    if (!userRole) return false;

    const route = PROTECTED_ROUTES.find(r => r.path === path);
    if (!route) return true; // Unprotected route

    // Check if user has required role
    if (route.requiredRole && !route.requiredRole.includes(userRole)) {
      return false;
    }

    // Check sidebar menu access
    if (route.requiredMenu && !canAccessSidebarMenu(route.requiredMenu)) {
      return false;
    }

    // Check module and action access
    if (route.requiredModule && route.requiredAction) {
      return canPerformAction(route.requiredModule, route.requiredAction);
    }

    // Check module access only
    if (route.requiredModule) {
      return hasModuleAccess(route.requiredModule);
    }

    return true;
  };

  return {
    userRole,
    canAccessSidebarMenu,
    canPerformAction,
    hasModuleAccess,
    getAllowedSidebarMenus,
    getAllowedActions,
    canAccessRoute,
    isLoading
  };
};

/**
 * Higher-order component for protecting routes
 */
export const withPermissions = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: {
    menu?: SidebarMenu;
    module?: Module;
    action?: ModuleAction;
    roles?: Role[];
  }
) => {
  return (props: P) => {
    const { 
      canAccessSidebarMenu, 
      canPerformAction, 
      hasModuleAccess,
      userRole,
      isLoading 
    } = usePermissions();

    if (isLoading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!userRole) {
      return <div className="flex items-center justify-center h-screen">Unauthorized</div>;
    }

    // Check role requirements
    if (requiredPermissions.roles && !requiredPermissions.roles.includes(userRole)) {
      return <div className="flex items-center justify-center h-screen">Access Denied</div>;
    }

    // Check menu access
    if (requiredPermissions.menu && !canAccessSidebarMenu(requiredPermissions.menu)) {
      return <div className="flex items-center justify-center h-screen">Access Denied</div>;
    }

    // Check module and action access
    if (requiredPermissions.module && requiredPermissions.action) {
      if (!canPerformAction(requiredPermissions.module, requiredPermissions.action)) {
        return <div className="flex items-center justify-center h-screen">Access Denied</div>;
      }
    } else if (requiredPermissions.module) {
      if (!hasModuleAccess(requiredPermissions.module)) {
        return <div className="flex items-center justify-center h-screen">Access Denied</div>;
      }
    }

    return <WrappedComponent {...props} />;
  };
};

/**
 * Component for conditionally rendering content based on permissions
 */
interface PermissionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  menu?: SidebarMenu;
  module?: Module;
  action?: ModuleAction;
  roles?: Role[];
  requireAll?: boolean; // If true, all conditions must be met. If false, any condition can be met.
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  fallback = null,
  menu,
  module,
  action,
  roles,
  requireAll = true
}) => {
  const { 
    canAccessSidebarMenu, 
    canPerformAction, 
    hasModuleAccess,
    userRole,
    isLoading 
  } = usePermissions();

  if (isLoading) return null;
  if (!userRole) return <>{fallback}</>;

  const checks: boolean[] = [];

  // Role check
  if (roles) {
    checks.push(roles.includes(userRole));
  }

  // Menu check
  if (menu) {
    checks.push(canAccessSidebarMenu(menu));
  }

  // Module and action check
  if (module && action) {
    checks.push(canPerformAction(module, action));
  } else if (module) {
    checks.push(hasModuleAccess(module));
  }

  // If no checks are specified, allow access
  if (checks.length === 0) {
    return <>{children}</>;
  }

  // Determine if user has access based on requireAll flag
  const hasAccess = requireAll 
    ? checks.every(check => check === true)
    : checks.some(check => check === true);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};