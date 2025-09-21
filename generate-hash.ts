import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nSQL to insert admin user:');
    console.log(`INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "emailNotifications", "createdAt", "updatedAt") 
VALUES ('admin-user-id', 'admin@myclinic.com', '${hash}', 'Admin', 'User', 'admin', true, true, NOW(), NOW());`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();