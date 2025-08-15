#!/usr/bin/env node

import { Pool } from 'pg';
import { MigrationRunner } from './migrationRunner';
import { config } from '../config/database';

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  const pool = new Pool(config);
  const runner = new MigrationRunner(pool);

  try {
    switch (command) {
      case 'migrate':
        console.log('Running migrations...');
        await runner.runMigrations();
        console.log('All migrations completed successfully');
        break;

      case 'rollback':
        if (!arg) {
          console.error('Usage: npm run migrate:rollback <migration_id>');
          process.exit(1);
        }
        console.log(`Rolling back to migration: ${arg}`);
        await runner.rollbackToMigration(arg);
        console.log('Rollback completed successfully');
        break;

      case 'rollback-one':
        const executed = await runner.getExecutedMigrations();
        if (executed.length === 0) {
          console.log('No migrations to rollback');
          break;
        }
        const lastMigration = executed[executed.length - 1];
        console.log(`Rolling back migration: ${lastMigration.id}`);
        await runner.rollbackMigration(lastMigration.id);
        console.log('Rollback completed successfully');
        break;

      case 'status':
        const status = await runner.getStatus();
        console.log('\n=== Migration Status ===');
        console.log(`Executed migrations: ${status.executed.length}`);
        console.log(`Pending migrations: ${status.pending.length}`);
        
        if (status.executed.length > 0) {
          console.log('\nExecuted:');
          status.executed.forEach(m => {
            console.log(`  ✓ ${m.id} (${m.executed_at.toISOString()})`);
          });
        }
        
        if (status.pending.length > 0) {
          console.log('\nPending:');
          status.pending.forEach(m => {
            console.log(`  ○ ${m.id}`);
          });
        }
        break;

      case 'create':
        if (!arg) {
          console.error('Usage: npm run migrate:create <migration_name>');
          process.exit(1);
        }
        await createMigration(arg);
        break;

      default:
        console.log('Available commands:');
        console.log('  migrate         - Run all pending migrations');
        console.log('  rollback <id>   - Rollback to specific migration');
        console.log('  rollback-one    - Rollback the last migration');
        console.log('  status          - Show migration status');
        console.log('  create <name>   - Create a new migration file');
        break;
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createMigration(name: string): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '');
  
  const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
  const filepath = path.join(__dirname, '../../migrations', filename);
  
  const template = `-- UP
-- Add your migration SQL here


-- DOWN
-- Add your rollback SQL here

`;

  fs.writeFileSync(filepath, template);
  console.log(`Created migration: ${filename}`);
}

if (require.main === module) {
  main();
}