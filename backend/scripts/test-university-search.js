const { Pool } = require('pg');
const { UniversityModel } = require('../dist/models/University');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stellarrec',
  user: process.env.DB_USER || 'stellarrec_user',
  password: process.env.DB_PASSWORD || 'stellarrec_password',
};

async function testUniversitySearch() {
  const pool = new Pool(dbConfig);
  const universityModel = new UniversityModel(pool);
  
  try {
    console.log('🔍 Testing University Search Functionality\n');
    
    // Test 1: Search by name
    console.log('1️⃣ Testing search by name (Harvard):');
    const harvardResults = await universityModel.search('Harvard');
    console.log(`   Found ${harvardResults.length} results`);
    harvardResults.forEach(u => console.log(`   • ${u.name} (${u.code})`));
    console.log();
    
    // Test 2: Search by code
    console.log('2️⃣ Testing search by code (MIT):');
    const mitResults = await universityModel.search('MIT');
    console.log(`   Found ${mitResults.length} results`);
    mitResults.forEach(u => console.log(`   • ${u.name} (${u.code})`));
    console.log();
    
    // Test 3: Filter by submission format
    console.log('3️⃣ Testing filter by submission format (API):');
    const apiResults = await universityModel.search('', { submissionFormat: 'api' });
    console.log(`   Found ${apiResults.length} universities with API submission`);
    apiResults.slice(0, 5).forEach(u => console.log(`   • ${u.name} (${u.code})`));
    if (apiResults.length > 5) console.log(`   ... and ${apiResults.length - 5} more`);
    console.log();
    
    // Test 4: Filter by category
    console.log('4️⃣ Testing filter by category (Ivy League):');
    const ivyResults = await universityModel.search('', { category: 'ivy_league' });
    console.log(`   Found ${ivyResults.length} Ivy League universities`);
    ivyResults.forEach(u => console.log(`   • ${u.name} (${u.code})`));
    console.log();
    
    // Test 5: Filter by program type
    console.log('5️⃣ Testing filter by program type (MBA):');
    const mbaResults = await universityModel.search('', { programType: 'mba' });
    console.log(`   Found ${mbaResults.length} universities accepting MBA applications`);
    mbaResults.slice(0, 5).forEach(u => console.log(`   • ${u.name} (${u.code})`));
    if (mbaResults.length > 5) console.log(`   ... and ${mbaResults.length - 5} more`);
    console.log();
    
    // Test 6: Combined filters
    console.log('6️⃣ Testing combined filters (University + Email + Top Public):');
    const combinedResults = await universityModel.search('University', {
      submissionFormat: 'email',
      category: 'top_public'
    });
    console.log(`   Found ${combinedResults.length} results`);
    combinedResults.forEach(u => console.log(`   • ${u.name} (${u.code})`));
    console.log();
    
    // Test 7: Program availability validation
    console.log('7️⃣ Testing program availability validation:');
    const allUniversities = await universityModel.findAll();
    const testIds = allUniversities.slice(0, 5).map(u => u.id);
    
    const graduateValidation = await universityModel.validateProgramAvailability(testIds, 'graduate');
    console.log(`   Graduate programs - Available: ${graduateValidation.available.length}, Unavailable: ${graduateValidation.unavailable.length}`);
    
    const mbaValidation = await universityModel.validateProgramAvailability(testIds, 'mba');
    console.log(`   MBA programs - Available: ${mbaValidation.available.length}, Unavailable: ${mbaValidation.unavailable.length}`);
    
    const medicalValidation = await universityModel.validateProgramAvailability(testIds, 'medical');
    console.log(`   Medical programs - Available: ${medicalValidation.available.length}, Unavailable: ${medicalValidation.unavailable.length}`);
    console.log();
    
    // Test 8: University categories
    console.log('8️⃣ Testing university categories:');
    const categories = await universityModel.getUniversityCategories();
    console.log(`   Ivy League: ${categories.ivy_league.length} universities`);
    console.log(`   Top Public: ${categories.top_public.length} universities`);
    console.log(`   Top Private: ${categories.top_private.length} universities`);
    console.log(`   Specialized: ${categories.specialized.length} universities`);
    console.log();
    
    // Test 9: ID validation
    console.log('9️⃣ Testing ID validation:');
    const validIds = allUniversities.slice(0, 3).map(u => u.id);
    const invalidIds = ['00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111'];
    const mixedIds = [...validIds, ...invalidIds];
    
    const validation = await universityModel.validateIds(mixedIds);
    console.log(`   Valid IDs: ${validation.valid.length}/${mixedIds.length}`);
    console.log(`   Invalid IDs: ${validation.invalid.length}/${mixedIds.length}`);
    console.log();
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testUniversitySearch()
    .then(() => {
      console.log('\n🎉 University search testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testUniversitySearch };