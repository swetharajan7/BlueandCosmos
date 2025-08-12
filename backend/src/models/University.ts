import { Pool } from 'pg';
import { University } from '../types';
import { AppError } from '../utils/AppError';

export class UniversityModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async findAll(isActive: boolean = true): Promise<University[]> {
    const query = `
      SELECT id, name, code, submission_format, is_active, created_at, updated_at
      FROM universities 
      WHERE is_active = $1
      ORDER BY name ASC
    `;

    const result = await this.db.query(query, [isActive]);
    return result.rows;
  }

  async findById(id: string): Promise<University> {
    const query = `
      SELECT id, name, code, submission_format, is_active, created_at, updated_at
      FROM universities 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('University not found', 404);
    }

    return result.rows[0];
  }

  async findByIds(ids: string[]): Promise<University[]> {
    if (ids.length === 0) {
      return [];
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT id, name, code, submission_format, is_active, created_at, updated_at
      FROM universities 
      WHERE id IN (${placeholders}) AND is_active = true
      ORDER BY name ASC
    `;

    const result = await this.db.query(query, ids);
    return result.rows;
  }

  async search(searchTerm: string, isActive: boolean = true): Promise<University[]> {
    const query = `
      SELECT id, name, code, submission_format, is_active, created_at, updated_at
      FROM universities 
      WHERE is_active = $1 
        AND (name ILIKE $2 OR code ILIKE $2)
      ORDER BY name ASC
    `;

    const result = await this.db.query(query, [isActive, `%${searchTerm}%`]);
    return result.rows;
  }

  async validateIds(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    if (ids.length === 0) {
      return { valid: [], invalid: [] };
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT id FROM universities 
      WHERE id IN (${placeholders}) AND is_active = true
    `;

    const result = await this.db.query(query, ids);
    const validIds = result.rows.map(row => row.id);
    const invalidIds = ids.filter(id => !validIds.includes(id));

    return { valid: validIds, invalid: invalidIds };
  }

  async getByProgramType(programType: string): Promise<University[]> {
    // For now, return all active universities
    // In the future, this could be filtered based on program availability
    return this.findAll(true);
  }
}