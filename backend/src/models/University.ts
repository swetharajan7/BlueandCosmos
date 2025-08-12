import { Pool } from 'pg';
import { University, UniversityRequirement } from '../types';
import { AppError } from '../utils/AppError';

export class UniversityModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async findAll(isActive: boolean = true): Promise<University[]> {
    const query = `
      SELECT u.id, u.name, u.code, u.api_endpoint, u.email_address, 
             u.submission_format, u.is_active, u.created_at, u.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ur.id,
                   'university_id', ur.university_id,
                   'requirement_type', ur.requirement_type,
                   'requirement_value', ur.requirement_value,
                   'is_required', ur.is_required,
                   'created_at', ur.created_at
                 )
               ) FILTER (WHERE ur.id IS NOT NULL), 
               '[]'::json
             ) as requirements
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE u.is_active = $1
      GROUP BY u.id, u.name, u.code, u.api_endpoint, u.email_address, 
               u.submission_format, u.is_active, u.created_at, u.updated_at
      ORDER BY u.name ASC
    `;

    const result = await this.db.query(query, [isActive]);
    return result.rows;
  }

  async findById(id: string): Promise<University> {
    const query = `
      SELECT u.id, u.name, u.code, u.api_endpoint, u.email_address, 
             u.submission_format, u.is_active, u.created_at, u.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ur.id,
                   'university_id', ur.university_id,
                   'requirement_type', ur.requirement_type,
                   'requirement_value', ur.requirement_value,
                   'is_required', ur.is_required,
                   'created_at', ur.created_at
                 )
               ) FILTER (WHERE ur.id IS NOT NULL), 
               '[]'::json
             ) as requirements
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.code, u.api_endpoint, u.email_address, 
               u.submission_format, u.is_active, u.created_at, u.updated_at
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

    const placeholders = ids.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT u.id, u.name, u.code, u.api_endpoint, u.email_address, 
             u.submission_format, u.is_active, u.created_at, u.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ur.id,
                   'university_id', ur.university_id,
                   'requirement_type', ur.requirement_type,
                   'requirement_value', ur.requirement_value,
                   'is_required', ur.is_required,
                   'created_at', ur.created_at
                 )
               ) FILTER (WHERE ur.id IS NOT NULL), 
               '[]'::json
             ) as requirements
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE u.id IN (${placeholders}) AND u.is_active = $1
      GROUP BY u.id, u.name, u.code, u.api_endpoint, u.email_address, 
               u.submission_format, u.is_active, u.created_at, u.updated_at
      ORDER BY u.name ASC
    `;

    const result = await this.db.query(query, [true, ...ids]);
    return result.rows;
  }

  async search(searchTerm: string, filters?: {
    programType?: string;
    submissionFormat?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<University[]> {
    const isActive = filters?.isActive ?? true;
    let whereConditions = ['u.is_active = $1'];
    let queryParams: any[] = [isActive];
    let paramIndex = 2;

    // Add search term condition with enhanced search
    if (searchTerm && searchTerm.trim()) {
      whereConditions.push(`(
        u.name ILIKE $${paramIndex} OR 
        u.code ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM university_requirements ur 
          WHERE ur.university_id = u.id 
          AND ur.requirement_value ILIKE $${paramIndex}
        )
      )`);
      queryParams.push(`%${searchTerm.trim()}%`);
      paramIndex++;
    }

    // Add submission format filter
    if (filters?.submissionFormat) {
      whereConditions.push(`u.submission_format = $${paramIndex}`);
      queryParams.push(filters.submissionFormat);
      paramIndex++;
    }

    // Add category filter
    if (filters?.category) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM university_requirements ur 
        WHERE ur.university_id = u.id 
        AND ur.requirement_type = 'category' 
        AND ur.requirement_value = $${paramIndex}
      )`);
      queryParams.push(filters.category);
      paramIndex++;
    }

    // Add program type filter (check requirements)
    if (filters?.programType) {
      whereConditions.push(`(
        NOT EXISTS (
          SELECT 1 FROM university_requirements ur 
          WHERE ur.university_id = u.id 
          AND ur.requirement_type = 'program_type' 
          AND ur.is_required = true
        ) OR EXISTS (
          SELECT 1 FROM university_requirements ur 
          WHERE ur.university_id = u.id 
          AND ur.requirement_type = 'program_type' 
          AND ur.requirement_value = $${paramIndex}
          AND ur.is_required = true
        )
      )`);
      queryParams.push(filters.programType);
      paramIndex++;
    }

    const query = `
      SELECT u.id, u.name, u.code, u.api_endpoint, u.email_address, 
             u.submission_format, u.is_active, u.created_at, u.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ur.id,
                   'university_id', ur.university_id,
                   'requirement_type', ur.requirement_type,
                   'requirement_value', ur.requirement_value,
                   'is_required', ur.is_required,
                   'created_at', ur.created_at
                 )
               ) FILTER (WHERE ur.id IS NOT NULL), 
               '[]'::json
             ) as requirements
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY u.id, u.name, u.code, u.api_endpoint, u.email_address, 
               u.submission_format, u.is_active, u.created_at, u.updated_at
      ORDER BY u.name ASC
    `;

    const result = await this.db.query(query, queryParams);
    return result.rows;
  }

  async validateIds(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    if (ids.length === 0) {
      return { valid: [], invalid: [] };
    }

    const placeholders = ids.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT id FROM universities 
      WHERE id IN (${placeholders}) AND is_active = $1
    `;

    const result = await this.db.query(query, [true, ...ids]);
    const validIds = result.rows.map(row => row.id);
    const invalidIds = ids.filter(id => !validIds.includes(id));

    return { valid: validIds, invalid: invalidIds };
  }

  async getByProgramType(programType: string): Promise<University[]> {
    return this.search('', { programType, isActive: true });
  }

  async validateProgramAvailability(universityIds: string[], programType: string): Promise<{
    available: string[];
    unavailable: string[];
  }> {
    if (universityIds.length === 0) {
      return { available: [], unavailable: [] };
    }

    const placeholders = universityIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT DISTINCT u.id,
        CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM university_requirements ur 
            WHERE ur.university_id = u.id 
            AND ur.requirement_type = 'program_type' 
            AND ur.is_required = true
          ) THEN true
          WHEN EXISTS (
            SELECT 1 FROM university_requirements ur 
            WHERE ur.university_id = u.id 
            AND ur.requirement_type = 'program_type' 
            AND ur.requirement_value = $1
            AND ur.is_required = true
          ) THEN true
          ELSE false
        END as is_available
      FROM universities u
      WHERE u.id IN (${placeholders}) AND u.is_active = true
    `;

    const result = await this.db.query(query, [programType, ...universityIds]);
    
    const available: string[] = [];
    const unavailable: string[] = [];

    result.rows.forEach(row => {
      if (row.is_available) {
        available.push(row.id);
      } else {
        unavailable.push(row.id);
      }
    });

    // Add any IDs that weren't found in the database to unavailable
    const foundIds = result.rows.map(row => row.id);
    const notFoundIds = universityIds.filter(id => !foundIds.includes(id));
    unavailable.push(...notFoundIds);

    return { available, unavailable };
  }

  async getUniversityCategories(): Promise<{
    ivy_league: University[];
    top_public: University[];
    top_private: University[];
    specialized: University[];
  }> {
    const query = `
      SELECT u.id, u.name, u.code, u.api_endpoint, u.email_address, 
             u.submission_format, u.is_active, u.created_at, u.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ur.id,
                   'university_id', ur.university_id,
                   'requirement_type', ur.requirement_type,
                   'requirement_value', ur.requirement_value,
                   'is_required', ur.is_required,
                   'created_at', ur.created_at
                 )
               ) FILTER (WHERE ur.id IS NOT NULL), 
               '[]'::json
             ) as requirements,
             COALESCE(
               (SELECT ur2.requirement_value 
                FROM university_requirements ur2 
                WHERE ur2.university_id = u.id 
                AND ur2.requirement_type = 'category' 
                LIMIT 1), 
               'other'
             ) as category
      FROM universities u
      LEFT JOIN university_requirements ur ON u.id = ur.university_id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.code, u.api_endpoint, u.email_address, 
               u.submission_format, u.is_active, u.created_at, u.updated_at
      ORDER BY u.name ASC
    `;

    const result = await this.db.query(query);
    
    const categories = {
      ivy_league: [] as University[],
      top_public: [] as University[],
      top_private: [] as University[],
      specialized: [] as University[]
    };

    result.rows.forEach(row => {
      const university = { ...row };
      delete university.category;

      switch (row.category) {
        case 'ivy_league':
          categories.ivy_league.push(university);
          break;
        case 'top_public':
          categories.top_public.push(university);
          break;
        case 'top_private':
          categories.top_private.push(university);
          break;
        case 'specialized':
          categories.specialized.push(university);
          break;
        default:
          // Add to specialized as default
          categories.specialized.push(university);
      }
    });

    return categories;
  }
}