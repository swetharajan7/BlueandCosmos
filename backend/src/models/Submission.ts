import { Pool } from 'pg';
import { Submission } from '../types';
import { AppError } from '../utils/AppError';

export class SubmissionModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async create(submissionData: {
    recommendation_id: string;
    university_id: string;
    submission_method: 'api' | 'email' | 'manual';
    status?: 'pending' | 'submitted' | 'confirmed' | 'failed';
  }): Promise<Submission> {
    const query = `
      INSERT INTO submissions (recommendation_id, university_id, submission_method, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      submissionData.recommendation_id,
      submissionData.university_id,
      submissionData.submission_method,
      submissionData.status || 'pending'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Submission> {
    const query = `
      SELECT s.*, 
             r.content as recommendation_content,
             r.word_count,
             u.name as university_name,
             u.code as university_code,
             u.submission_format,
             u.api_endpoint,
             u.email_address
      FROM submissions s
      JOIN recommendations r ON s.recommendation_id = r.id
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Submission not found', 404);
    }

    return result.rows[0];
  }

  async findByRecommendationId(recommendationId: string): Promise<Submission[]> {
    const query = `
      SELECT s.*, 
             u.name as university_name,
             u.code as university_code,
             u.submission_format,
             u.api_endpoint,
             u.email_address
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE s.recommendation_id = $1
      ORDER BY s.created_at ASC
    `;

    const result = await this.db.query(query, [recommendationId]);
    return result.rows;
  }

  async updateStatus(id: string, status: 'pending' | 'submitted' | 'confirmed' | 'failed', options?: {
    external_reference?: string;
    error_message?: string;
    submitted_at?: Date;
    confirmed_at?: Date;
  }): Promise<Submission> {
    const updateFields = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [id, status];
    let paramIndex = 3;

    if (options?.external_reference) {
      updateFields.push(`external_reference = $${paramIndex}`);
      values.push(options.external_reference);
      paramIndex++;
    }

    if (options?.error_message) {
      updateFields.push(`error_message = $${paramIndex}`);
      values.push(options.error_message);
      paramIndex++;
    }

    if (options?.submitted_at) {
      updateFields.push(`submitted_at = $${paramIndex}`);
      values.push(options.submitted_at.toISOString());
      paramIndex++;
    }

    if (options?.confirmed_at) {
      updateFields.push(`confirmed_at = $${paramIndex}`);
      values.push(options.confirmed_at.toISOString());
      paramIndex++;
    }

    const query = `
      UPDATE submissions 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new AppError('Submission not found', 404);
    }

    return result.rows[0];
  }

  async incrementRetryCount(id: string): Promise<Submission> {
    const query = `
      UPDATE submissions 
      SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Submission not found', 404);
    }

    return result.rows[0];
  }

  async findPendingSubmissions(limit: number = 50): Promise<Submission[]> {
    const query = `
      SELECT s.*, 
             r.content as recommendation_content,
             r.word_count,
             u.name as university_name,
             u.code as university_code,
             u.submission_format,
             u.api_endpoint,
             u.email_address,
             app.legal_name as applicant_name,
             app.program_type,
             app.application_term
      FROM submissions s
      JOIN recommendations r ON s.recommendation_id = r.id
      JOIN universities u ON s.university_id = u.id
      JOIN applications app ON r.application_id = app.id
      WHERE s.status = 'pending' AND s.retry_count < 5
      ORDER BY s.created_at ASC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  async findFailedSubmissions(maxRetries: number = 5): Promise<Submission[]> {
    const query = `
      SELECT s.*, 
             r.content as recommendation_content,
             r.word_count,
             u.name as university_name,
             u.code as university_code,
             u.submission_format,
             u.api_endpoint,
             u.email_address,
             app.legal_name as applicant_name,
             app.program_type,
             app.application_term
      FROM submissions s
      JOIN recommendations r ON s.recommendation_id = r.id
      JOIN universities u ON s.university_id = u.id
      JOIN applications app ON r.application_id = app.id
      WHERE s.status = 'failed' OR s.retry_count >= $1
      ORDER BY s.updated_at DESC
    `;

    const result = await this.db.query(query, [maxRetries]);
    return result.rows;
  }

  async getSubmissionStats(): Promise<{
    pending: number;
    submitted: number;
    confirmed: number;
    failed: number;
    total: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total
      FROM submissions
    `;

    const result = await this.db.query(query);
    const stats = result.rows[0];
    
    return {
      pending: parseInt(stats.pending) || 0,
      submitted: parseInt(stats.submitted) || 0,
      confirmed: parseInt(stats.confirmed) || 0,
      failed: parseInt(stats.failed) || 0,
      total: parseInt(stats.total) || 0
    };
  }

  async createBulkSubmissions(recommendationId: string, universityIds: string[]): Promise<Submission[]> {
    if (universityIds.length === 0) {
      return [];
    }

    // First, get the submission methods for each university
    const universityQuery = `
      SELECT id, submission_format 
      FROM universities 
      WHERE id = ANY($1) AND is_active = true
    `;
    
    const universityResult = await this.db.query(universityQuery, [universityIds]);
    const universities = universityResult.rows;

    if (universities.length === 0) {
      throw new AppError('No valid universities found', 400);
    }

    // Create submissions for each university
    const submissions: Submission[] = [];
    
    for (const university of universities) {
      try {
        const submission = await this.create({
          recommendation_id: recommendationId,
          university_id: university.id,
          submission_method: university.submission_format,
          status: 'pending'
        });
        submissions.push(submission);
      } catch (error) {
        // If submission already exists, skip it
        if (error instanceof Error && error.message.includes('duplicate key')) {
          continue;
        }
        throw error;
      }
    }

    return submissions;
  }

  async deleteByRecommendationId(recommendationId: string): Promise<void> {
    const query = 'DELETE FROM submissions WHERE recommendation_id = $1';
    await this.db.query(query, [recommendationId]);
  }
}