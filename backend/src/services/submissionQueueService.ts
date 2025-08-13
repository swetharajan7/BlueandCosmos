import { Pool } from 'pg';
import { Submission } from '../types';
import { SubmissionModel } from '../models/Submission';
import { UniversityIntegrationService } from './universityIntegrationService';
import { AppError } from '../utils/AppError';

export interface QueuedSubmission {
  id: string;
  priority: number;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  backoffMultiplier: number;
  lastError?: string;
}

export class SubmissionQueueService {
  private db: Pool;
  private submissionModel: SubmissionModel;
  private integrationService: UniversityIntegrationService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_PRIORITY = 5;
  private readonly HIGH_PRIORITY = 1;
  private readonly LOW_PRIORITY = 10;
  private readonly MAX_RETRIES = 5;
  private readonly BASE_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 300000; // 5 minutes

  constructor(db: Pool) {
    this.db = db;
    this.submissionModel = new SubmissionModel(db);
    this.integrationService = new UniversityIntegrationService(db);
  }

  async startProcessing(intervalMs: number = 30000): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('Starting submission queue processing...');

    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Error processing submission queue:', error);
      }
    }, intervalMs);

    // Process immediately on start
    await this.processQueue();
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('Stopped submission queue processing');
  }

  async addToQueue(submissionId: string, priority: number = this.DEFAULT_PRIORITY): Promise<void> {
    const query = `
      INSERT INTO submission_queue (submission_id, priority, scheduled_at, attempts, max_attempts, backoff_multiplier)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 0, $3, 2.0)
      ON CONFLICT (submission_id) DO UPDATE SET
        priority = EXCLUDED.priority,
        scheduled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.db.query(query, [submissionId, priority, this.MAX_RETRIES]);
  }

  async addBulkToQueue(submissionIds: string[], priority: number = this.DEFAULT_PRIORITY): Promise<void> {
    if (submissionIds.length === 0) {
      return;
    }

    const values = submissionIds.map((id, index) => {
      const baseIndex = index * 4;
      return `($${baseIndex + 1}, $${baseIndex + 2}, CURRENT_TIMESTAMP, 0, $${baseIndex + 3}, $${baseIndex + 4})`;
    }).join(', ');

    const query = `
      INSERT INTO submission_queue (submission_id, priority, scheduled_at, attempts, max_attempts, backoff_multiplier)
      VALUES ${values}
      ON CONFLICT (submission_id) DO UPDATE SET
        priority = EXCLUDED.priority,
        scheduled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    const params: any[] = [];
    submissionIds.forEach(id => {
      params.push(id, priority, this.MAX_RETRIES, 2.0);
    });

    await this.db.query(query, params);
  }

  async processQueue(): Promise<void> {
    const batchSize = 10;
    const queuedItems = await this.getNextQueueItems(batchSize);

    if (queuedItems.length === 0) {
      return;
    }

    console.log(`Processing ${queuedItems.length} queued submissions...`);

    const promises = queuedItems.map(item => this.processQueueItem(item));
    await Promise.allSettled(promises);
  }

  private async getNextQueueItems(limit: number): Promise<QueuedSubmission[]> {
    const query = `
      SELECT sq.submission_id as id, sq.priority, sq.scheduled_at, sq.attempts, 
             sq.max_attempts, sq.backoff_multiplier, sq.last_error
      FROM submission_queue sq
      JOIN submissions s ON sq.submission_id = s.id
      WHERE sq.scheduled_at <= CURRENT_TIMESTAMP 
        AND sq.attempts < sq.max_attempts
        AND s.status IN ('pending', 'failed')
      ORDER BY sq.priority ASC, sq.scheduled_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      priority: row.priority,
      scheduledAt: row.scheduled_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      backoffMultiplier: row.backoff_multiplier,
      lastError: row.last_error
    }));
  }

  private async processQueueItem(item: QueuedSubmission): Promise<void> {
    try {
      console.log(`Processing submission ${item.id} (attempt ${item.attempts + 1}/${item.maxAttempts})`);

      // Update attempt count
      await this.updateQueueItemAttempt(item.id, item.attempts + 1);

      // Process the submission
      await this.integrationService.processSubmission(item.id);

      // Remove from queue on success
      await this.removeFromQueue(item.id);

      console.log(`Successfully processed submission ${item.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to process submission ${item.id}:`, errorMessage);

      await this.handleQueueItemFailure(item, errorMessage);
    }
  }

  private async updateQueueItemAttempt(submissionId: string, attempts: number): Promise<void> {
    const query = `
      UPDATE submission_queue 
      SET attempts = $2, updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $1
    `;

    await this.db.query(query, [submissionId, attempts]);
  }

  private async handleQueueItemFailure(item: QueuedSubmission, errorMessage: string): Promise<void> {
    const newAttempts = item.attempts + 1;

    if (newAttempts >= item.maxAttempts) {
      // Max attempts reached, remove from queue and mark as permanently failed
      await this.removeFromQueue(item.id);
      await this.submissionModel.updateStatus(item.id, 'failed', {
        error_message: `Max retry attempts exceeded. Last error: ${errorMessage}`
      });
      console.log(`Submission ${item.id} permanently failed after ${newAttempts} attempts`);
      return;
    }

    // Calculate exponential backoff delay
    const backoffDelay = this.calculateBackoffDelay(newAttempts, item.backoffMultiplier);
    const nextScheduledAt = new Date(Date.now() + backoffDelay);

    // Update queue item with new schedule and error
    const query = `
      UPDATE submission_queue 
      SET attempts = $2, 
          scheduled_at = $3, 
          last_error = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $1
    `;

    await this.db.query(query, [item.id, newAttempts, nextScheduledAt, errorMessage]);

    console.log(`Submission ${item.id} scheduled for retry in ${Math.round(backoffDelay / 1000)} seconds`);
  }

  private calculateBackoffDelay(attempts: number, multiplier: number): number {
    const delay = this.BASE_BACKOFF_MS * Math.pow(multiplier, attempts - 1);
    return Math.min(delay, this.MAX_BACKOFF_MS);
  }

  async removeFromQueue(submissionId: string): Promise<void> {
    const query = 'DELETE FROM submission_queue WHERE submission_id = $1';
    await this.db.query(query, [submissionId]);
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    scheduled: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE sq.scheduled_at <= CURRENT_TIMESTAMP AND sq.attempts < sq.max_attempts) as pending,
        COUNT(*) FILTER (WHERE sq.scheduled_at > CURRENT_TIMESTAMP AND sq.attempts < sq.max_attempts) as scheduled,
        COUNT(*) FILTER (WHERE sq.attempts >= sq.max_attempts) as failed,
        COUNT(*) as total
      FROM submission_queue sq
      JOIN submissions s ON sq.submission_id = s.id
      WHERE s.status IN ('pending', 'failed')
    `;

    const result = await this.db.query(query);
    const stats = result.rows[0];

    return {
      pending: parseInt(stats.pending) || 0,
      processing: 0, // We don't track processing state separately
      failed: parseInt(stats.failed) || 0,
      scheduled: parseInt(stats.scheduled) || 0
    };
  }

  async retrySubmission(submissionId: string, priority: number = this.HIGH_PRIORITY): Promise<void> {
    // Reset the submission status
    await this.submissionModel.updateStatus(submissionId, 'pending', {
      error_message: undefined
    });

    // Add back to queue with high priority
    await this.addToQueue(submissionId, priority);
  }

  async retryAllFailed(): Promise<number> {
    const failedSubmissions = await this.submissionModel.findFailedSubmissions();
    
    if (failedSubmissions.length === 0) {
      return 0;
    }

    const submissionIds = failedSubmissions.map(s => s.id);
    
    // Reset all failed submissions to pending
    const resetQuery = `
      UPDATE submissions 
      SET status = 'pending', error_message = NULL, retry_count = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1)
    `;
    await this.db.query(resetQuery, [submissionIds]);

    // Add all to queue with default priority
    await this.addBulkToQueue(submissionIds, this.DEFAULT_PRIORITY);

    return submissionIds.length;
  }

  async clearQueue(): Promise<void> {
    await this.db.query('DELETE FROM submission_queue');
  }

  async getQueueItems(limit: number = 50, offset: number = 0): Promise<{
    items: Array<QueuedSubmission & {
      university_name: string;
      applicant_name: string;
      status: string;
    }>;
    total: number;
  }> {
    const countQuery = 'SELECT COUNT(*) as total FROM submission_queue';
    const countResult = await this.db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT sq.submission_id as id, sq.priority, sq.scheduled_at, sq.attempts, 
             sq.max_attempts, sq.backoff_multiplier, sq.last_error,
             u.name as university_name, s.status,
             COALESCE(app.legal_name, 'Unknown') as applicant_name
      FROM submission_queue sq
      JOIN submissions s ON sq.submission_id = s.id
      JOIN universities u ON s.university_id = u.id
      LEFT JOIN recommendations r ON s.recommendation_id = r.id
      LEFT JOIN applications app ON r.application_id = app.id
      ORDER BY sq.priority ASC, sq.scheduled_at ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.db.query(query, [limit, offset]);
    
    const items = result.rows.map(row => ({
      id: row.id,
      priority: row.priority,
      scheduledAt: row.scheduled_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      backoffMultiplier: row.backoff_multiplier,
      lastError: row.last_error,
      university_name: row.university_name,
      applicant_name: row.applicant_name,
      status: row.status
    }));

    return { items, total };
  }

  async setPriority(submissionId: string, priority: number): Promise<void> {
    if (priority < 1 || priority > 10) {
      throw new AppError('Priority must be between 1 (highest) and 10 (lowest)', 400);
    }

    const query = `
      UPDATE submission_queue 
      SET priority = $2, updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $1
    `;

    const result = await this.db.query(query, [submissionId, priority]);
    
    if (result.rowCount === 0) {
      throw new AppError('Submission not found in queue', 404);
    }
  }
}

// Create the submission_queue table if it doesn't exist
export async function createSubmissionQueueTable(db: Pool): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS submission_queue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      backoff_multiplier DECIMAL(3,1) NOT NULL DEFAULT 2.0,
      last_error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(submission_id)
    );

    CREATE INDEX IF NOT EXISTS idx_submission_queue_priority_scheduled 
    ON submission_queue(priority ASC, scheduled_at ASC);
    
    CREATE INDEX IF NOT EXISTS idx_submission_queue_scheduled_at 
    ON submission_queue(scheduled_at);
    
    CREATE INDEX IF NOT EXISTS idx_submission_queue_attempts 
    ON submission_queue(attempts);

    CREATE TRIGGER IF NOT EXISTS update_submission_queue_updated_at 
    BEFORE UPDATE ON submission_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  await db.query(query);
}