#!/usr/bin/env node

// Role-based Permission System Test Script
// This script tests the permission system with different user roles

const { storage } = require('./server/storage');
const { PermissionService } = require('./shared/permissions');

async function testPermissionSystem() {
  console.log('\n🔐 Testing Role-based Permission System\n');
  console.log('=' * 50);

  // Test users with different roles
  const testUsers = [
    {
      email: 'admin@clinic.com',
      expectedRole: 'super_admin',
      name: 'Super Admin User'
    },
    {
      email: 'dr.johnson@clinicconnect.com', 
      expectedRole: 'doctor',
      name: 'Dr. Sarah Johnson'
    },
    {
      email: 'dr.anderson@clinicconnect.com',
      expectedRole: 'doctor', 
      name: 'Dr. David Anderson'
    },
    {
      email: 'dr.smith@clinicconnect.com',
      expectedRole: 'technician',
      name: 'Dr. John Smith (Technician)'
    }
  ];

  console.log('\n📋 Testing Users and Their Permissions:\n');

  for (const testUser of testUsers) {
    try {
      console.log(`\n👤 Testing ${testUser.name} (${testUser.email})`);
      console.log('-'.repeat(60));

      // Get user from database
      const users = await storage.getUsers();
      const dbUser = users.find(u => u.email === testUser.email);
      
      if (!dbUser) {
        console.log(`❌ User not found in database: ${testUser.email}`);
        continue;
      }

      const userRole = dbUser.role;
      console.log(`🎭 Role: ${userRole}`);
      console.log(`✅ Expected: ${testUser.expectedRole} | Actual: ${userRole} | Match: ${userRole === testUser.expectedRole ? '✅' : '❌'}`);

      // Test sidebar menu permissions
      console.log('\n📱 Sidebar Menu Access:');
      const sidebarMenus = ['dashboard', 'patients', 'analytics', 'reports', 'user-management', 'settings', 'notifications'];
      
      sidebarMenus.forEach(menu => {
        const hasAccess = PermissionService.canAccessSidebarMenu(userRole, menu);
        console.log(`  ${hasAccess ? '✅' : '❌'} ${menu}`);
      });

      // Test module permissions
      console.log('\n🏥 Patient Module Permissions:');
      const patientActions = ['view', 'add', 'edit', 'delete', 'export', 'upload_files'];
      
      patientActions.forEach(action => {
        const hasPermission = PermissionService.canPerformAction(userRole, 'patients', action);
        console.log(`  ${hasPermission ? '✅' : '❌'} ${action}`);
      });

      // Test user management permissions (if applicable)
      if (PermissionService.hasModuleAccess(userRole, 'users')) {
        console.log('\n👥 User Management Permissions:');
        const userActions = ['view', 'add', 'edit', 'delete', 'export'];
        
        userActions.forEach(action => {
          const hasPermission = PermissionService.canPerformAction(userRole, 'users', action);
          console.log(`  ${hasPermission ? '✅' : '❌'} ${action}`);
        });
      }

    } catch (error) {
      console.log(`❌ Error testing ${testUser.name}: ${error.message}`);
    }
  }

  console.log('\n🎯 Permission Matrix Summary:\n');
  console.log('Feature'.padEnd(20) + 'Super Admin'.padEnd(12) + 'Doctor'.padEnd(12) + 'Technician');
  console.log('-'.repeat(60));
  
  const features = [
    { name: 'Dashboard', module: null, action: null, menu: 'dashboard' },
    { name: 'View Patients', module: 'patients', action: 'view' },
    { name: 'Add Patients', module: 'patients', action: 'add' },
    { name: 'Edit Patients', module: 'patients', action: 'edit' },
    { name: 'Delete Patients', module: 'patients', action: 'delete' },
    { name: 'Export Patients', module: 'patients', action: 'export' },
    { name: 'User Management', module: null, action: null, menu: 'user-management' },
    { name: 'Analytics', module: null, action: null, menu: 'analytics' },
    { name: 'Settings', module: null, action: null, menu: 'settings' }
  ];

  features.forEach(feature => {
    let row = feature.name.padEnd(20);
    
    ['super_admin', 'doctor', 'technician'].forEach(role => {
      let hasAccess = false;
      
      if (feature.menu) {
        hasAccess = PermissionService.canAccessSidebarMenu(role, feature.menu);
      } else if (feature.module && feature.action) {
        hasAccess = PermissionService.canPerformAction(role, feature.module, feature.action);
      }
      
      row += (hasAccess ? '✅' : '❌').padEnd(12);
    });
    
    console.log(row);
  });

  console.log('\n✅ Permission system test completed!\n');
}

// Run the test
testPermissionSystem().catch(console.error);