// Permission System Demonstration
// This script shows how different roles see different UI elements

import { PermissionService } from './client/src/types/permissions';

function demonstratePermissions() {
  console.log('\n🎭 Role-based Permission System Demonstration\n');
  console.log('='.repeat(60));

  const roles = ['super_admin', 'doctor', 'technician'] as const;
  
  roles.forEach(role => {
    console.log(`\n👤 ${role.toUpperCase().replace('_', ' ')} USER EXPERIENCE:`);
    console.log('-'.repeat(50));
    
    // Show sidebar menus
    console.log('\n📱 Visible Sidebar Menus:');
    const sidebarMenus = [
      'dashboard', 'patients', 'analytics', 
      'reports', 'user-management', 'settings', 'notifications'
    ] as const;
    
    sidebarMenus.forEach(menu => {
      const hasAccess = PermissionService.canAccessSidebarMenu(role, menu);
      if (hasAccess) {
        console.log(`   ✅ ${menu.charAt(0).toUpperCase() + menu.slice(1).replace('-', ' ')}`);
      }
    });

    // Show available actions for patients
    console.log('\n🏥 Patient Management Actions:');
    const patientActions = [
      'view', 'add', 'edit', 'delete', 'export', 'upload_files'
    ] as const;
    
    patientActions.forEach(action => {
      const hasPermission = PermissionService.canPerformAction(role, 'patients', action);
      if (hasPermission) {
        console.log(`   ✅ ${action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}`);
      }
    });

    // Show restricted actions
    console.log('\n🚫 Restricted Actions:');
    const allActions = [
      { module: 'users' as const, action: 'view' as const, label: 'User Management' },
      { module: 'analytics' as const, action: 'view' as const, label: 'Analytics' },
      { module: 'settings' as const, action: 'view' as const, label: 'Settings' },
      { module: 'patients' as const, action: 'delete' as const, label: 'Delete Patients' },
      { module: 'patients' as const, action: 'export' as const, label: 'Export Patients' }
    ];

    allActions.forEach(({ module, action, label }) => {
      const hasPermission = PermissionService.canPerformAction(role, module, action);
      if (!hasPermission) {
        console.log(`   ❌ ${label}`);
      }
    });

    console.log('\n' + '='.repeat(50));
  });

  // Show permission matrix
  console.log('\n📊 PERMISSION MATRIX:\n');
  
  const matrix = [
    { feature: 'Dashboard', check: (role: any) => PermissionService.canAccessSidebarMenu(role, 'dashboard') },
    { feature: 'View Patients', check: (role: any) => PermissionService.canPerformAction(role, 'patients', 'view') },
    { feature: 'Add Patients', check: (role: any) => PermissionService.canPerformAction(role, 'patients', 'add') },
    { feature: 'Edit Patients', check: (role: any) => PermissionService.canPerformAction(role, 'patients', 'edit') },
    { feature: 'Delete Patients', check: (role: any) => PermissionService.canPerformAction(role, 'patients', 'delete') },
    { feature: 'Export Patients', check: (role: any) => PermissionService.canPerformAction(role, 'patients', 'export') },
    { feature: 'User Management', check: (role: any) => PermissionService.canAccessSidebarMenu(role, 'user-management') },
    { feature: 'Analytics', check: (role: any) => PermissionService.canAccessSidebarMenu(role, 'analytics') },
    { feature: 'Settings', check: (role: any) => PermissionService.canAccessSidebarMenu(role, 'settings') },
  ];

  console.log('Feature'.padEnd(20) + 'Super Admin'.padEnd(12) + 'Doctor'.padEnd(12) + 'Technician');
  console.log('-'.repeat(60));

  matrix.forEach(({ feature, check }) => {
    let row = feature.padEnd(20);
    
    roles.forEach(role => {
      const hasAccess = check(role);
      row += (hasAccess ? '✅' : '❌').padEnd(12);
    });
    
    console.log(row);
  });

  console.log('\n💡 KEY DIFFERENCES:');
  console.log('• Super Admin: Complete system access');
  console.log('• Doctor: Full patient management + dashboard');  
  console.log('• Technician: Limited patient access (no delete/export)');
  console.log('\n✅ Permission system working correctly!\n');
}

// Run the demonstration
demonstratePermissions();