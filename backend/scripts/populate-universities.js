const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stellarrec',
  user: process.env.DB_USER || 'stellarrec_user',
  password: process.env.DB_PASSWORD || 'stellarrec_password',
};

async function populateUniversities() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await pool.connect();
    
    console.log('Reading SQL file...');
    const sqlFile = path.join(__dirname, '../../database/populate_universities.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Executing SQL script...');
    await pool.query(sql);
    
    console.log('Checking results...');
    const result = await pool.query('SELECT COUNT(*) as count FROM universities WHERE is_active = true');
    const requirementsResult = await pool.query('SELECT COUNT(*) as count FROM university_requirements');
    
    console.log(`✅ Successfully populated ${result.rows[0].count} universities`);
    console.log(`✅ Successfully created ${requirementsResult.rows[0].count} university requirements`);
    
    // Show some sample data
    const sampleResult = await pool.query(`
      SELECT u.name, u.code, u.submission_format,
             COUNT(ur.id) as requirements_count
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.code, u.submission_format
      ORDER BY u.name
      LIMIT 10
    `);
    
    console.log('\n📋 Sample universities:');
    sampleResult.rows.forEach(row => {
      console.log(`  • ${row.name} (${row.code}) - ${row.submission_format} - ${row.requirements_count} requirements`);
    });
    
    // Show category distribution
    const categoryResult = await pool.query(`
      SELECT ur.requirement_value as category, COUNT(*) as count
      FROM university_requirements ur
      WHERE ur.requirement_type = 'category'
      GROUP BY ur.requirement_value
      ORDER BY count DESC
    `);
    
    console.log('\n📊 University categories:');
    categoryResult.rows.forEach(row => {
      console.log(`  • ${row.category}: ${row.count} universities`);
    });
    
  } catch (error) {
    console.error('❌ Error populating universities:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  populateUniversities()
    .then(() => {
      console.log('\n🎉 University population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateUniversities };