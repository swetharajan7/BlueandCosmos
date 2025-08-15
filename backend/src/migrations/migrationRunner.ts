import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  filename: string;
  up: string;
  down: string;
  timestamp: Date;
}

interface MigrationRecord {
  id: string;
  filename: string;
  executed_at: Date;
  checksum: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir: string = path.join(__dirname, '../../migrations')) {
    this.pool = pool;
    this.migrationsDir = migrationsDir;
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      );
    `);
  }

  async getMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const filePath = path.join(this.migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split migration into up and down parts
      const parts = content.split('-- DOWN');
      const up = parts[0].replace('-- UP', '').trim();
      const down = parts[1] ? parts[1].trim() : '';

      const id = file.replace('.sql', '');
      const timestamp = this.extractTimestamp(id);

      migrations.push({
        id,
        filename: file,
        up,
        down,
        timestamp
      });
    }

    return migrations;
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.pool.query(
      'SELECT id, filename, executed_at, checksum FROM schema_migrations ORDER BY executed_at'
    );
    return result.rows;
  }

  async runMigrations(): Promise<void> {
    await this.initialize();
    
    const migrations = await this.getMigrations();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    console.log(`Found ${migrations.length} migrations, ${executed.length} already executed`);

    for (const migration of migrations) {
      if (!executedIds.has(migration.id)) {
        await this.runMigration(migration);
      } else {
        // Verify checksum
        const executedMigration = executed.find(m => m.id === migration.id);
        const currentChecksum = this.calculateChecksum(migration.up);
        
        if (executedMigration && executedMigration.checksum !== currentChecksum) {
          throw new Error(`Migration ${migration.id} has been modified after execution`);
        }
      }
    }
  }

  async runMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Running migration: ${migration.filename}`);
      
      // Execute the migration
      await client.query(migration.up);
      
      // Record the migration
      const checksum = this.calculateChecksum(migration.up);
      await client.query(
        'INSERT INTO schema_migrations (id, filename, checksum) VALUES ($1, $2, $3)',
        [migration.id, migration.filename, checksum]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${migration.filename} completed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration ${migration.filename} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const migrations = await this.getMigrations();
    const migration = migrations.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (!migration.down) {
      throw new Error(`Migration ${migrationId} has no rollback script`);
    }

    const executed = await this.getExecutedMigrations();
    const executedMigration = executed.find(m => m.id === migrationId);
    
    if (!executedMigration) {
      throw new Error(`Migration ${migrationId} has not been executed`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Rolling back migration: ${migration.filename}`);
      
      // Execute the rollback
      await client.query(migration.down);
      
      // Remove the migration record
      await client.query('DELETE FROM schema_migrations WHERE id = $1', [migrationId]);
      
      await client.query('COMMIT');
      console.log(`Migration ${migration.filename} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Rollback of ${migration.filename} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackToMigration(targetMigrationId: string): Promise<void> {
    const executed = await this.getExecutedMigrations();
    const targetIndex = executed.findIndex(m => m.id === targetMigrationId);
    
    if (targetIndex === -1) {
      throw new Error(`Target migration ${targetMigrationId} not found in executed migrations`);
    }

    // Rollback migrations in reverse order
    const migrationsToRollback = executed.slice(targetIndex + 1).reverse();
    
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration.id);
    }
  }

  async getStatus(): Promise<{ pending: Migration[], executed: MigrationRecord[] }> {
    const migrations = await this.getMigrations();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));
    
    const pending = migrations.filter(m => !executedIds.has(m.id));
    
    return { pending, executed };
  }

  private extractTimestamp(migrationId: string): Date {
    // Extract timestamp from migration ID (format: YYYYMMDDHHMMSS_description)
    const timestampStr = migrationId.substring(0, 14);
    const year = parseInt(timestampStr.substring(0, 4));
    const month = parseInt(timestampStr.substring(4, 6)) - 1;
    const day = parseInt(timestampStr.substring(6, 8));
    const hour = parseInt(timestampStr.substring(8, 10));
    const minute = parseInt(timestampStr.substring(10, 12));
    const second = parseInt(timestampStr.substring(12, 14));
    
    return new Date(year, month, day, hour, minute, second);
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}