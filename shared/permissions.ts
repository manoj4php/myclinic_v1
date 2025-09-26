// Role-based Permission System Types and Configuration

export type Role = 'super_admin' | 'doctor' | 'technician';

export type SidebarMenu = 
  | 'dashboard' 
  | 'patients' 
  | 'analytics' 
  | 'reports' 
  | 'user-management' 
  | 'settings' 
  | 'notifications';

export type ModuleAction = 
  | 'view' 
  | 'add' 
  | 'edit' 
  | 'delete' 
  | 'export' 
  | 'import' 
  | 'print' 
  | 'upload_files';

export type Module = 'patients' | 'users' | 'analytics' | 'reports' | 'settings';

export interface Permission {
  module: Module;
  actions: ModuleAction[];
}

export interface RoleConfig {
  name: string;
  description: string;
  sidebarMenus: SidebarMenu[];
  permissions: Permission[];
}

export interface RolePermissions {
  [key: string]: RoleConfig;
}

// Complete Role-based Permission Configuration
export const ROLE_PERMISSIONS: RolePermissions = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full access to all application features',
    sidebarMenus: [
      'dashboard',
      'patients', 
      'analytics',
      'reports',
      'user-management',
      'settings',
      'notifications'
    ],
    permissions: [
      {
        module: 'patients',
        actions: ['view', 'add', 'edit', 'delete', 'export', 'import', 'print', 'upload_files']
      },
      {
        module: 'users',
        actions: ['view', 'add', 'edit', 'delete', 'export']
      },
      {
        module: 'analytics',
        actions: ['view', 'export']
      },
      {
        module: 'reports',
        actions: ['view', 'add', 'edit', 'delete', 'export', 'print']
      },
      {
        module: 'settings',
        actions: ['view', 'edit']
      }
    ]
  },
  
  doctor: {
    name: 'Doctor',
    description: 'Access to patient management and dashboard',
    sidebarMenus: ['dashboard', 'patients'],
    permissions: [
      {
        module: 'patients',
        actions: ['view', 'add', 'edit', 'delete', 'export', 'print', 'upload_files']
      }
    ]
  },
  
  technician: {
    name: 'Technician',
    description: 'Limited access to patient data entry and viewing',
    sidebarMenus: ['dashboard', 'patients'],
    permissions: [
      {
        module: 'patients',
        actions: ['view', 'add', 'edit', 'upload_files']
      }
    ]
  }
};

// Permission Check Utility Functions
export class PermissionService {
  
  /**
   * Check if a role has access to a specific sidebar menu
   */
  static canAccessSidebarMenu(userRole: Role, menu: SidebarMenu): boolean {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    return roleConfig?.sidebarMenus.includes(menu) ?? false;
  }

  /**
   * Check if a role can perform a specific action on a module
   */
  static canPerformAction(userRole: Role, module: Module, action: ModuleAction): boolean {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    if (!roleConfig) return false;

    const modulePermission = roleConfig.permissions.find(p => p.module === module);
    return modulePermission?.actions.includes(action) ?? false;
  }

  /**
   * Get all allowed sidebar menus for a role
   */
  static getAllowedSidebarMenus(userRole: Role): SidebarMenu[] {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    return roleConfig?.sidebarMenus ?? [];
  }

  /**
   * Get all allowed actions for a role and module
   */
  static getAllowedActions(userRole: Role, module: Module): ModuleAction[] {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    if (!roleConfig) return [];

    const modulePermission = roleConfig.permissions.find(p => p.module === module);
    return modulePermission?.actions ?? [];
  }

  /**
   * Check if user has any access to a module
   */
  static hasModuleAccess(userRole: Role, module: Module): boolean {
    const roleConfig = ROLE_PERMISSIONS[userRole];
    if (!roleConfig) return false;

    return roleConfig.permissions.some(p => p.module === module);
  }

  /**
   * Get role configuration
   */
  static getRoleConfig(userRole: Role): RoleConfig | null {
    return ROLE_PERMISSIONS[userRole] ?? null;
  }

  /**
   * Check if role exists
   */
  static isValidRole(role: string): role is Role {
    return role in ROLE_PERMISSIONS;
  }

  /**
   * Get all available roles
   */
  static getAllRoles(): Role[] {
    return Object.keys(ROLE_PERMISSIONS) as Role[];
  }

  /**
   * Filter menu items based on user role
   */
  static filterMenuItems<T extends { key: SidebarMenu }>(
    userRole: Role, 
    menuItems: T[]
  ): T[] {
    const allowedMenus = this.getAllowedSidebarMenus(userRole);
    return menuItems.filter(item => allowedMenus.includes(item.key));
  }

  /**
   * Filter actions based on user role and module
   */
  static filterActions<T extends { action: ModuleAction }>(
    userRole: Role,
    module: Module,
    actions: T[]
  ): T[] {
    const allowedActions = this.getAllowedActions(userRole, module);
    return actions.filter(item => allowedActions.includes(item.action));
  }
}

// Route Protection Types
export interface ProtectedRoute {
  path: string;
  requiredRole?: Role[];
  requiredMenu?: SidebarMenu;
  requiredModule?: Module;
  requiredAction?: ModuleAction;
}

// Common route configurations
export const PROTECTED_ROUTES: ProtectedRoute[] = [
  {
    path: '/dashboard',
    requiredMenu: 'dashboard'
  },
  {
    path: '/patients',
    requiredMenu: 'patients',
    requiredModule: 'patients',
    requiredAction: 'view'
  },
  {
    path: '/add-patient',
    requiredMenu: 'patients',
    requiredModule: 'patients',
    requiredAction: 'add'
  },
  {
    path: '/analytics',
    requiredMenu: 'analytics',
    requiredModule: 'analytics',
    requiredAction: 'view'
  },
  {
    path: '/reports',
    requiredMenu: 'reports',
    requiredModule: 'reports',
    requiredAction: 'view'
  },
  {
    path: '/user-management',
    requiredMenu: 'user-management',
    requiredModule: 'users',
    requiredAction: 'view'
  },
  {
    path: '/settings',
    requiredMenu: 'settings',
    requiredModule: 'settings',
    requiredAction: 'view'
  },
  {
    path: '/notifications',
    requiredMenu: 'notifications'
  }
];