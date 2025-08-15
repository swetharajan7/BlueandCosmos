#!/usr/bin/env node

/**
 * Demo Admin User Creation Script
 * Creates a demo admin user for testing the launch management features
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stellarrec',
  user: process.env.DB_USER || 'stellarrec_user',
  password: process.env.DB_PASSWORD || 'stellarrec_password'
};

async function createDemoAdmin() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 Creating demo admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const adminUser = {
      email: 'admin@stellarrec.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminUser.email]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('✅ Demo admin user already exists');
      console.log('📧 Email: admin@stellarrec.com');
      console.log('🔑 Password: admin123');
      return;
    }
    
    // Insert admin user
    const result = await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      adminUser.email,
      adminUser.password,
      adminUser.first_name,
      adminUser.last_name,
      adminUser.role,
      adminUser.is_verified,
      adminUser.created_at,
      adminUser.updated_at
    ]);
    
    console.log('✅ Demo admin user created successfully!');
    console.log('📧 Email: admin@stellarrec.com');
    console.log('🔑 Password: admin123');
    console.log('🆔 User ID:', result.rows[0].id);
    console.log('');
    console.log('🚀 You can now:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Login with the admin credentials');
    console.log('3. Access the Admin Dashboard from the user menu');
    console.log('4. Navigate to "Launch Management" tab');
    console.log('5. View real-time metrics and launch controls');
    
  } catch (error) {
    console.error('❌ Error creating demo admin user:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure PostgreSQL is running and accessible');
      console.log('💡 Check your database configuration in .env file');
    }
    
    if (error.code === '42P01') {
      console.log('');
      console.log('💡 Users table does not exist');
      console.log('💡 Run database migrations first: npm run migrate');
    }
    
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createDemoAdmin();
}

module.exports = { createDemoAdmin };