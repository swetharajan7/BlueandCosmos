import { Pool } from 'pg';
import { pool } from '../config/database';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'schema';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  created_at: Date;
  completed_at?: Date;
  file_path?: string;
  s3_key?: string;
  error_message?: string;
}

export interface RestoreInfo {
  id: string;
  backup_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export class BackupService {
  private db: Pool;
  private s3Client: S3Client;
  private backupDir: string;
  private s3Bucket: string;

  constructor() {
    this.db = pool;
    this.backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    this.s3Bucket = process.env.S3_BACKUP_BUCKET || 'stellarrec-backups';
    
    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }

  async createBackup(type: 'full' | 'incremental' | 'schema' = 'full'): Promise<BackupInfo> {
    try {
      // Create backup record
      const backupId = this.generateBackupId();
      const createQuery = `
        INSERT INTO backups (id, type, status, created_at)
        VALUES ($1, $2, 'pending', NOW())
        RETURNING *
      `;

      const result = await this.db.query(createQuery, [backupId, type]);
      const backup = result.rows[0];

      // Start backup process asynchronously
      this.performBackup(backup).catch(error => {
        console.error('Backup failed:', error);
        this.updateBackupStatus(backupId, 'failed', error.message);
      });

      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async getBackups(limit: number = 50): Promise<BackupInfo[]> {
    try {
      const query = `
        SELECT * FROM backups
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting backups:', error);
      throw error;
    }
  }

  async getBackupDetails(backupId: string): Promise<BackupInfo | null> {
    try {
      const query = 'SELECT * FROM backups WHERE id = $1';
      const result = await this.db.query(query, [backupId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting backup details:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<RestoreInfo> {
    try {
      // Check if backup exists and is completed
      const backup = await this.getBackupDetails(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      if (backup.status !== 'completed') {
        throw new Error('Backup is not completed');
      }

      // Create restore record
      const restoreId = this.generateRestoreId();
      const createQuery = `
        INSERT INTO backup_restores (id, backup_id, status, created_at)
        VALUES ($1, $2, 'pending', NOW())
        RETURNING *
      `;

      const result = await this.db.query(createQuery, [restoreId, backupId]);
      const restore = result.rows[0];

      // Start restore process asynchronously
      this.performRestore(restore, backup).catch(error => {
        console.error('Restore failed:', error);
        this.updateRestoreStatus(restoreId, 'failed', error.message);
      });

      return restore;
    } catch (error) {
      console.error('Error starting restore:', error);
      throw error;
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backup = await this.getBackupDetails(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Delete from S3 if exists
      if (backup.s3_key) {
        await this.deleteFromS3(backup.s3_key);
      }

      // Delete local file if exists
      if (backup.file_path && existsSync(backup.file_path)) {
        const fs = require('fs').promises;
        await fs.unlink(backup.file_path);
      }

      // Delete backup record
      await this.db.query('DELETE FROM backups WHERE id = $1', [backupId]);
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  async scheduleAutomaticBackups(): Promise<void> {
    try {
      // Get system configuration for backup settings
      const configQuery = `
        SELECT config_value 
        FROM system_config 
        WHERE config_key IN ('backup.autoBackupEnabled', 'backup.backupFrequency')
      `;

      const configResult = await this.db.query(configQuery);
      const config: any = {};
      
      configResult.rows.forEach(row => {
        const key = row.config_key.split('.')[1];
        config[key] = JSON.parse(row.config_value);
      });

      if (!config.autoBackupEnabled) {
        return;
      }

      // Check if backup is due
      const lastBackupQuery = `
        SELECT created_at 
        FROM backups 
        WHERE status = 'completed' 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const lastBackupResult = await this.db.query(lastBackupQuery);
      const lastBackup = lastBackupResult.rows[0];

      if (this.isBackupDue(lastBackup?.created_at, config.backupFrequency)) {
        await this.createBackup('full');
      }
    } catch (error) {
      console.error('Error scheduling automatic backups:', error);
    }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      // Get retention policy from configuration
      const configQuery = `
        SELECT config_value 
        FROM system_config 
        WHERE config_key = 'backup.backupRetentionDays'
      `;

      const configResult = await this.db.query(configQuery);
      const retentionDays = configResult.rows.length > 0 
        ? JSON.parse(configResult.rows[0].config_value) 
        : 30;

      // Find old backups
      const oldBackupsQuery = `
        SELECT id, s3_key, file_path
        FROM backups
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
        AND status = 'completed'
      `;

      const oldBackups = await this.db.query(oldBackupsQuery);

      // Delete old backups
      for (const backup of oldBackups.rows) {
        await this.deleteBackup(backup.id);
      }

      console.log(`Cleaned up ${oldBackups.rows.length} old backups`);
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  private async performBackup(backup: BackupInfo): Promise<void> {
    try {
      await this.updateBackupStatus(backup.id, 'in_progress');

      const fileName = `backup_${backup.id}_${backup.type}_${Date.now()}.sql`;
      const filePath = join(this.backupDir, fileName);
      const compressedPath = `${filePath}.gz`;

      // Create database dump
      await this.createDatabaseDump(backup.type, filePath);

      // Compress the backup
      await this.compressFile(filePath, compressedPath);

      // Upload to S3
      const s3Key = await this.uploadToS3(compressedPath, `backups/${fileName}.gz`);

      // Get file size
      const fs = require('fs');
      const stats = fs.statSync(compressedPath);

      // Update backup record
      await this.updateBackupRecord(backup.id, {
        status: 'completed',
        size: stats.size,
        file_path: compressedPath,
        s3_key: s3Key,
        completed_at: new Date()
      });

      // Clean up local file if S3 upload successful
      if (s3Key) {
        fs.unlinkSync(filePath);
        // Keep compressed file for local access
      }

      console.log(`Backup ${backup.id} completed successfully`);
    } catch (error) {
      console.error(`Backup ${backup.id} failed:`, error);
      await this.updateBackupStatus(backup.id, 'failed', error.message);
      throw error;
    }
  }

  private async performRestore(restore: RestoreInfo, backup: BackupInfo): Promise<void> {
    try {
      await this.updateRestoreStatus(restore.id, 'in_progress');

      let filePath = backup.file_path;

      // Download from S3 if not available locally
      if (!filePath || !existsSync(filePath)) {
        if (backup.s3_key) {
          filePath = await this.downloadFromS3(backup.s3_key);
        } else {
          throw new Error('Backup file not available');
        }
      }

      // Decompress if needed
      let sqlFilePath = filePath;
      if (filePath.endsWith('.gz')) {
        sqlFilePath = filePath.replace('.gz', '');
        await this.decompressFile(filePath, sqlFilePath);
      }

      // Restore database
      await this.restoreDatabase(sqlFilePath);

      // Update restore record
      await this.updateRestoreRecord(restore.id, {
        status: 'completed',
        completed_at: new Date()
      });

      console.log(`Restore ${restore.id} completed successfully`);
    } catch (error) {
      console.error(`Restore ${restore.id} failed:`, error);
      await this.updateRestoreStatus(restore.id, 'failed', error.message);
      throw error;
    }
  }

  private async createDatabaseDump(type: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'stellarrec',
        username: process.env.DB_USER || 'postgres'
      };

      let pgDumpArgs = [
        '-h', dbConfig.host,
        '-p', dbConfig.port,
        '-U', dbConfig.username,
        '-d', dbConfig.database,
        '-f', filePath,
        '--verbose'
      ];

      if (type === 'schema') {
        pgDumpArgs.push('--schema-only');
      } else if (type === 'incremental') {
        // For incremental, we'd need to implement change tracking
        // For now, treat as full backup
        pgDumpArgs.push('--data-only');
      }

      const pgDump = spawn('pg_dump', pgDumpArgs, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async restoreDatabase(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'stellarrec',
        username: process.env.DB_USER || 'postgres'
      };

      const psqlArgs = [
        '-h', dbConfig.host,
        '-p', dbConfig.port,
        '-U', dbConfig.username,
        '-d', dbConfig.database,
        '-f', filePath,
        '--verbose'
      ];

      const psql = spawn('psql', psqlArgs, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psql.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    const gzip = createGzip();

    await pipeline(input, gzip, output);
  }

  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    const gunzip = createGunzip();

    await pipeline(input, gunzip, output);
  }

  private async uploadToS3(filePath: string, key: string): Promise<string> {
    try {
      const fileStream = createReadStream(filePath);
      
      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: fileStream,
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(command);
      return key;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  private async downloadFromS3(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);
      const filePath = join(this.backupDir, `temp_${Date.now()}_${key.split('/').pop()}`);
      
      if (response.Body) {
        const writeStream = createWriteStream(filePath);
        await pipeline(response.Body as any, writeStream);
        return filePath;
      } else {
        throw new Error('No data received from S3');
      }
    } catch (error) {
      console.error('Error downloading from S3:', error);
      throw error;
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw error;
    }
  }

  private async updateBackupStatus(backupId: string, status: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE backups 
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
    `;

    await this.db.query(query, [status, errorMessage, backupId]);
  }

  private async updateBackupRecord(backupId: string, updates: any): Promise<void> {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [backupId, ...Object.values(updates)];

    const query = `UPDATE backups SET ${setClause}, updated_at = NOW() WHERE id = $1`;
    await this.db.query(query, values);
  }

  private async updateRestoreStatus(restoreId: string, status: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE backup_restores 
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
    `;

    await this.db.query(query, [status, errorMessage, restoreId]);
  }

  private async updateRestoreRecord(restoreId: string, updates: any): Promise<void> {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [restoreId, ...Object.values(updates)];

    const query = `UPDATE backup_restores SET ${setClause}, updated_at = NOW() WHERE id = $1`;
    await this.db.query(query, values);
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRestoreId(): string {
    return `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isBackupDue(lastBackupDate: Date | null, frequency: string): boolean {
    if (!lastBackupDate) return true;

    const now = new Date();
    const lastBackup = new Date(lastBackupDate);
    const diffHours = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

    switch (frequency) {
      case 'hourly': return diffHours >= 1;
      case 'daily': return diffHours >= 24;
      case 'weekly': return diffHours >= 168;
      case 'monthly': return diffHours >= 720;
      default: return diffHours >= 24;
    }
  }
}