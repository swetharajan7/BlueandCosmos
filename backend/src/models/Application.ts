import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Application, University } from '../types';
import { AppError } from '../utils/AppError';

export class ApplicationModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async create(applicationData: {
    student_id: string;
    legal_name: string;
    program_type: string;
    application_term: string;
    university_ids: string[];
    status?: string;
  }): Promise<Application> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const applicationId = uuidv4();
      
      // Insert application
      const applicationQuery = `
        INSERT INTO applications (id, student_id, legal_name, program_type, application_term, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const applicationResult = await client.query(applicationQuery, [
        applicationId,
        applicationData.student_id,
        applicationData.legal_name,
        applicationData.program_type,
        applicationData.application_term,
        applicationData.status || 'draft'
      ]);

      // Insert university associations
      if (applicationData.university_ids && applicationData.university_ids.length > 0) {
        const universityInsertQuery = `
          INSERT INTO application_universities (application_id, university_id)
          VALUES ($1, $2)
        `;
        
        for (const universityId of applicationData.university_ids) {
          await client.query(universityInsertQuery, [applicationId, universityId]);
        }
      }

      await client.query('COMMIT');

      // Fetch the complete application with universities
      return await this.findById(applicationId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Application> {
    const query = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'code', u.code,
              'submission_format', u.submission_format,
              'is_active', u.is_active
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as universities
      FROM applications a
      LEFT JOIN application_universities au ON a.id = au.application_id
      LEFT JOIN universities u ON au.university_id = u.id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Application not found', 404);
    }

    return result.rows[0];
  }

  async findByStudentId(studentId: string): Promise<Application[]> {
    const query = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'code', u.code,
              'submission_format', u.submission_format,
              'is_active', u.is_active
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as universities
      FROM applications a
      LEFT JOIN application_universities au ON a.id = au.application_id
      LEFT JOIN universities u ON au.university_id = u.id
      WHERE a.student_id = $1
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;

    const result = await this.db.query(query, [studentId]);
    return result.rows;
  }

  async update(id: string, updateData: {
    legal_name?: string;
    program_type?: string;
    application_term?: string;
    status?: string;
    university_ids?: string[];
  }): Promise<Application> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.legal_name !== undefined) {
        updateFields.push(`legal_name = $${paramIndex++}`);
        updateValues.push(updateData.legal_name);
      }
      
      if (updateData.program_type !== undefined) {
        updateFields.push(`program_type = $${paramIndex++}`);
        updateValues.push(updateData.program_type);
      }
      
      if (updateData.application_term !== undefined) {
        updateFields.push(`application_term = $${paramIndex++}`);
        updateValues.push(updateData.application_term);
      }
      
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updateData.status);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const updateQuery = `
          UPDATE applications 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        await client.query(updateQuery, updateValues);
      }

      // Update university associations if provided
      if (updateData.university_ids !== undefined) {
        // Delete existing associations
        await client.query('DELETE FROM application_universities WHERE application_id = $1', [id]);
        
        // Insert new associations
        if (updateData.university_ids.length > 0) {
          const universityInsertQuery = `
            INSERT INTO application_universities (application_id, university_id)
            VALUES ($1, $2)
          `;
          
          for (const universityId of updateData.university_ids) {
            await client.query(universityInsertQuery, [id, universityId]);
          }
        }
      }

      await client.query('COMMIT');

      // Return updated application
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.query('DELETE FROM applications WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw new AppError('Application not found', 404);
    }
  }

  async validateOwnership(applicationId: string, studentId: string): Promise<boolean> {
    const query = 'SELECT id FROM applications WHERE id = $1 AND student_id = $2';
    const result = await this.db.query(query, [applicationId, studentId]);
    return result.rows.length > 0;
  }
}