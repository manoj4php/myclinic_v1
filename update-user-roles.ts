// Update User Roles Script
// This script updates specific users with the correct roles for testing

import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq, or } from "drizzle-orm";

async function updateUserRoles() {
  console.log('🔄 Updating user roles for permission system testing...\n');

  try {
    // Define role mappings
    const roleUpdates = [
      {
        email: 'dr.smith@clinicconnect.com',
        role: 'technician',
        description: 'Technician - Limited access to patient data entry and viewing'
      },
      {
        email: 'dr.johnson@clinicconnect.com', 
        role: 'doctor',
        description: 'Doctor - Full patient management access'
      },
      {
        email: 'dr.anderson@clinicconnect.com',
        role: 'doctor', 
        description: 'Doctor - Full patient management access'
      },
      {
        email: 'admin@clinic.com',
        role: 'super_admin',
        description: 'Super Admin - Full system access'
      }
    ];

    // Update each user's role
    for (const update of roleUpdates) {
      try {
        const result = await db
          .update(users)
          .set({ role: update.role as any })
          .where(eq(users.email, update.email))
          .returning({ id: users.id, email: users.email, role: users.role });

        if (result.length > 0) {
          console.log(`✅ Updated ${update.email}:`);
          console.log(`   Role: ${update.role}`);
          console.log(`   Description: ${update.description}\n`);
        } else {
          console.log(`❌ User not found: ${update.email}\n`);
        }
      } catch (error: any) {
        console.log(`❌ Error updating ${update.email}: ${error?.message || error}\n`);
      }
    }

    // Verify the updates
    console.log('📋 Verifying role updates...\n');
    
    const updatedUsers = await db
      .select({
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(or(
        eq(users.email, 'dr.smith@clinicconnect.com'),
        eq(users.email, 'dr.johnson@clinicconnect.com'),
        eq(users.email, 'dr.anderson@clinicconnect.com'),
        eq(users.email, 'admin@clinic.com')
      ));

    console.log('Current User Roles:');
    console.log('-'.repeat(80));
    console.log('Email'.padEnd(35) + 'Name'.padEnd(25) + 'Role');
    console.log('-'.repeat(80));
    
    updatedUsers.forEach(user => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      console.log(
        (user.email || '').padEnd(35) + 
        name.padEnd(25) + 
        (user.role || '')
      );
    });

    console.log('\n✅ Role updates completed successfully!');
    console.log('\n🎯 Role Summary:');
    console.log('- Super Admin: Full access to all features');
    console.log('- Doctor: Dashboard + Full patient management');
    console.log('- Technician: Dashboard + Limited patient access (no delete/export)');

  } catch (error) {
    console.error('❌ Error updating user roles:', error);
  }
}

// Run the update
updateUserRoles().catch(console.error);