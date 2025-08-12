import { Pool } from 'pg';
import { UniversityModel } from '../models/University';
import { University } from '../types';

// Mock database pool
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

const universityModel = new UniversityModel(mockDb);

describe('UniversityModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    const mockUniversities: University[] = [
      {
        id: '1',
        name: 'Harvard University',
        code: 'HARVARD',
        submission_format: 'email',
        requirements: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '2',
        name: 'Massachusetts Institute of Technology',
        code: 'MIT',
        submission_format: 'api',
        requirements: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    it('should search universities by name', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockUniversities });

      const result = await universityModel.search('Harvard');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.name ILIKE $2'),
        expect.arrayContaining([true, '%Harvard%'])
      );
      expect(result).toEqual(mockUniversities);
    });

    it('should search universities by code', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockUniversities });

      const result = await universityModel.search('MIT');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.code ILIKE $2'),
        expect.arrayContaining([true, '%MIT%'])
      );
      expect(result).toEqual(mockUniversities);
    });

    it('should filter by submission format', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockUniversities[1]] });

      const result = await universityModel.search('', { submissionFormat: 'api' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.submission_format = $2'),
        expect.arrayContaining([true, 'api'])
      );
      expect(result).toEqual([mockUniversities[1]]);
    });

    it('should filter by category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockUniversities });

      const result = await universityModel.search('', { category: 'ivy_league' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ur.requirement_type = \'category\''),
        expect.arrayContaining([true, 'ivy_league'])
      );
      expect(result).toEqual(mockUniversities);
    });

    it('should filter by program type', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockUniversities });

      const result = await universityModel.search('', { programType: 'graduate' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ur.requirement_type = \'program_type\''),
        expect.arrayContaining([true, 'graduate'])
      );
      expect(result).toEqual(mockUniversities);
    });

    it('should combine multiple filters', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockUniversities });

      const result = await universityModel.search('Harvard', {
        submissionFormat: 'email',
        category: 'ivy_league',
        programType: 'graduate'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.name ILIKE $2'),
        expect.arrayContaining([true, '%Harvard%', 'email', 'ivy_league', 'graduate'])
      );
      expect(result).toEqual(mockUniversities);
    });
  });

  describe('validateProgramAvailability', () => {
    it('should validate program availability for universities', async () => {
      const mockResult = {
        rows: [
          { id: '1', is_available: true },
          { id: '2', is_available: false },
        ]
      };
      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await universityModel.validateProgramAvailability(['1', '2'], 'graduate');

      expect(result).toEqual({
        available: ['1'],
        unavailable: ['2']
      });
    });

    it('should handle empty university list', async () => {
      const result = await universityModel.validateProgramAvailability([], 'graduate');

      expect(result).toEqual({
        available: [],
        unavailable: []
      });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('getUniversityCategories', () => {
    it('should return universities grouped by categories', async () => {
      const mockResult = {
        rows: [
          { 
            id: '1',
            name: 'Harvard University',
            code: 'HARVARD',
            submission_format: 'email',
            requirements: [],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            category: 'ivy_league' 
          },
          { 
            id: '2',
            name: 'Massachusetts Institute of Technology',
            code: 'MIT',
            submission_format: 'api',
            requirements: [],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            category: 'specialized' 
          },
        ]
      };
      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await universityModel.getUniversityCategories();

      expect(result).toHaveProperty('ivy_league');
      expect(result).toHaveProperty('top_public');
      expect(result).toHaveProperty('top_private');
      expect(result).toHaveProperty('specialized');
      expect(result.ivy_league).toHaveLength(1);
      expect(result.specialized).toHaveLength(1);
    });
  });

  describe('validateIds', () => {
    it('should validate university IDs', async () => {
      const mockResult = {
        rows: [{ id: '1' }]
      };
      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await universityModel.validateIds(['1', '2', '3']);

      expect(result).toEqual({
        valid: ['1'],
        invalid: ['2', '3']
      });
    });

    it('should handle empty ID list', async () => {
      const result = await universityModel.validateIds([]);

      expect(result).toEqual({
        valid: [],
        invalid: []
      });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });
});