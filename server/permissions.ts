import { Request, Response, NextFunction } from 'express';
import { PermissionService, Role, Module, ModuleAction } from '../shared/permissions';

// Interface for the authenticated request that matches the existing one in routes.ts
interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    email?: string;
    claims?: {
      sub: string;
      email?: string;
    };
  };
}

/**
 * Middleware to check if user has permission to perform an action on a module
 */
export const requirePermission = (module: Module, action: ModuleAction) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user?.claims?.sub) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      const userId = req.user.claims.sub;
      let userRole: Role = 'super_admin'; // Default fallback

      // Get user role from database
      try {
        const { storage } = await import('./storage');
        const user = await storage.getUser(userId);
        if (user?.role) {
          userRole = user.role as Role;
        }
      } catch (dbError) {
        console.warn('Database not available for permission check, using default role');
      }

      // Check if user role is valid
      if (!PermissionService.isValidRole(userRole)) {
        return res.status(403).json({
          error: 'Invalid role',
          message: 'Your user role is invalid. Please contact administrator.'
        });
      }

      // Check if user has permission for this action
      if (!PermissionService.canPerformAction(userRole, module, action)) {
        const roleConfig = PermissionService.getRoleConfig(userRole);
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Your role (${roleConfig?.name || userRole}) does not have permission to ${action} ${module}`,
          requiredPermission: { module, action },
          userRole: userRole
        });
      }

      // User has permission, continue to next middleware
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * Middleware to check if user has specific role(s)
 */
export const requireRole = (allowedRoles: Role | Role[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      const userId = req.user.claims.sub;
      let userRole: Role = 'super_admin'; // Default fallback

      // Get user role from database
      try {
        const { storage } = await import('./storage');
        const user = await storage.getUser(userId);
        if (user?.role) {
          userRole = user.role as Role;
        }
      } catch (dbError) {
        console.warn('Database not available for role check, using default role');
      }

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient role',
          message: `Access restricted to: ${roles.join(', ')}`,
          userRole: userRole,
          requiredRoles: roles
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        error: 'Role check failed',
        message: 'An error occurred while checking role'
      });
    }
  };
};

/**
 * Middleware to check if user has module access (any action)
 */
export const requireModuleAccess = (module: Module) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      const userId = req.user.claims.sub;
      let userRole: Role = 'super_admin'; // Default fallback

      // Get user role from database
      try {
        const { storage } = await import('./storage');
        const user = await storage.getUser(userId);
        if (user?.role) {
          userRole = user.role as Role;
        }
      } catch (dbError) {
        console.warn('Database not available for module access check, using default role');
      }

      if (!PermissionService.hasModuleAccess(userRole, module)) {
        const roleConfig = PermissionService.getRoleConfig(userRole);
        return res.status(403).json({
          error: 'Module access denied',
          message: `Your role (${roleConfig?.name || userRole}) does not have access to ${module} module`,
          userRole: userRole,
          module: module
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      return res.status(500).json({
        error: 'Module access check failed',
        message: 'An error occurred while checking module access'
      });
    }
  };
};

/**
 * Super Admin only middleware
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Doctor or Super Admin middleware
 */
export const requireDoctor = requireRole(['doctor', 'super_admin']);

/**
 * Any authenticated user with valid role
 */
export const requireValidRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    const userId = req.user.claims.sub;
    let userRole: Role = 'super_admin'; // Default fallback

    // Get user role from database
    try {
      const { storage } = await import('./storage');
      const user = await storage.getUser(userId);
      if (user?.role) {
        userRole = user.role as Role;
      }
    } catch (dbError) {
      console.warn('Database not available for role validation, using default role');
    }

    if (!PermissionService.isValidRole(userRole)) {
      return res.status(403).json({
        error: 'Invalid role',
        message: 'Your user role is invalid. Please contact administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('Role validation error:', error);
    return res.status(500).json({
      error: 'Role validation failed',
      message: 'An error occurred while validating role'
    });
  }
};

/**
 * Utility function to get user permissions for API responses
 */
export const getUserPermissions = (userRole: Role) => {
  const roleConfig = PermissionService.getRoleConfig(userRole);
  return {
    role: userRole,
    roleName: roleConfig?.name,
    roleDescription: roleConfig?.description,
    sidebarMenus: PermissionService.getAllowedSidebarMenus(userRole),
    permissions: roleConfig?.permissions || [],
    modules: roleConfig?.permissions.map(p => p.module) || []
  };
};

/**
 * Common permission sets for easy use
 */
export const PatientPermissions = {
  view: requirePermission('patients', 'view'),
  add: requirePermission('patients', 'add'),
  edit: requirePermission('patients', 'edit'),
  delete: requirePermission('patients', 'delete'),
  export: requirePermission('patients', 'export'),
  import: requirePermission('patients', 'import'),
  print: requirePermission('patients', 'print'),
  uploadFiles: requirePermission('patients', 'upload_files'),
  moduleAccess: requireModuleAccess('patients')
};

export const UserPermissions = {
  view: requirePermission('users', 'view'),
  add: requirePermission('users', 'add'),
  edit: requirePermission('users', 'edit'),
  delete: requirePermission('users', 'delete'),
  export: requirePermission('users', 'export'),
  moduleAccess: requireModuleAccess('users')
};

export const AnalyticsPermissions = {
  view: requirePermission('analytics', 'view'),
  export: requirePermission('analytics', 'export'),
  moduleAccess: requireModuleAccess('analytics')
};

export const ReportsPermissions = {
  view: requirePermission('reports', 'view'),
  add: requirePermission('reports', 'add'),
  edit: requirePermission('reports', 'edit'),
  delete: requirePermission('reports', 'delete'),
  export: requirePermission('reports', 'export'),
  print: requirePermission('reports', 'print'),
  moduleAccess: requireModuleAccess('reports')
};

export const SettingsPermissions = {
  view: requirePermission('settings', 'view'),
  edit: requirePermission('settings', 'edit'),
  moduleAccess: requireModuleAccess('settings')
};