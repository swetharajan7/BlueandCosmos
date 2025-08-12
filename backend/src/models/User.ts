import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, RegisterRequest } from '../types';
import { AppError } from '../utils/AppError';

export class UserModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async create(userData: RegisterRequest): Promise<Omit<User, 'password_hash'>> {
    const { email, password, first_name, last_name, phone, role } = userData;
    
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, first_name, last_name, phone, role, is_verified, created_at, updated_at
    `;

    const values = [
      id,
      email.toLowerCase().trim(),
      password_hash,
      first_name.trim(),
      last_name.trim(),
      phone?.trim() || null,
      role,
      false, // is_verified starts as false
      now,
      now
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError('User with this email already exists', 409);
      }
      throw new AppError('Failed to create user', 500);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, phone, role, is_verified, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;

    try {
      const result = await this.db.query(query, [email.toLowerCase().trim()]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to find user', 500);
    }
  }

  async findById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const query = `
      SELECT id, email, first_name, last_name, phone, role, is_verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to find user', 500);
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new AppError('Password verification failed', 500);
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = $2
      WHERE id = $3
    `;

    try {
      await this.db.query(query, [password_hash, new Date(), userId]);
    } catch (error) {
      throw new AppError('Failed to update password', 500);
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET is_verified = true, updated_at = $1
      WHERE id = $2
    `;

    try {
      await this.db.query(query, [new Date(), userId]);
    } catch (error) {
      throw new AppError('Failed to verify email', 500);
    }
  }

  async updateProfile(userId: string, updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone'>>): Promise<Omit<User, 'password_hash'>> {
    const allowedFields = ['first_name', 'last_name', 'phone'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;
    
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, phone, role, is_verified, created_at, updated_at
    `;

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }
      return result.rows[0];
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update profile', 500);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [userId]);
      if (result.rowCount === 0) {
        throw new AppError('User not found', 404);
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete user', 500);
    }
  }
}