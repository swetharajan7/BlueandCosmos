import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIWritingAssistant from '../AIWritingAssistant';
import { aiService } from '../../../services/aiService';

// Mock the AI service
jest.mock('../../../services/aiService', () => ({
  aiService: {
    generateOutline: jest.fn(),
    suggestExamples: jest.fn(),
    improveWriting: jest.fn(),
    analyzeQuality: jest.fn(),
  }
}));

const mockApplicationData = {
  applicantName: 'John Doe',
  programType: 'graduate',
  universities: ['Harvard University', 'MIT'],
  relationshipType: 'Academic Advisor',
  relationshipDuration: '2-3 years',
  recommenderTitle: 'Professor'
};

const mockOnContentChange = jest.fn();
const mockOnInsertText = jest.fn();

describe('AIWritingAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AI writing tools', () => {
    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content=""
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    expect(screen.getByText('AI Writing Tools')).toBeInTheDocument();
    expect(screen.getByText('Generate Outline')).toBeInTheDocument();
    expect(screen.getByText('Get Example Phrases')).toBeInTheDocument();
    expect(screen.getByText('Improve Writing')).toBeInTheDocument();
  });

  it('generates outline when button is clicked', async () => {
    const mockOutline = 'I. Introduction\nII. Academic Performance\nIII. Research Skills\nIV. Conclusion';
    (aiService.generateOutline as jest.Mock).mockResolvedValue(mockOutline);

    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content=""
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    const generateButton = screen.getByText('Generate Outline');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(aiService.generateOutline).toHaveBeenCalledWith(mockApplicationData);
    });
  });

  it('suggests examples when button is clicked', async () => {
    const mockExamples = [
      'John demonstrates exceptional analytical skills',
      'His research contributions have been significant',
      'I recommend him without reservation'
    ];
    (aiService.suggestExamples as jest.Mock).mockResolvedValue(mockExamples);

    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content=""
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    const examplesButton = screen.getByText('Get Example Phrases');
    fireEvent.click(examplesButton);

    await waitFor(() => {
      expect(aiService.suggestExamples).toHaveBeenCalledWith({
        programType: mockApplicationData.programType,
        relationshipType: mockApplicationData.relationshipType,
        recommenderTitle: mockApplicationData.recommenderTitle
      });
    });
  });

  it('analyzes quality when content is provided', async () => {
    const mockAnalysis = {
      score: 8,
      strengths: ['Professional tone', 'Specific examples'],
      improvements: ['Add more metrics', 'Include leadership examples'],
      suggestions: ['Consider adding research achievements'],
      wordCount: 150,
      hasSpecificExamples: true,
      isProfessional: true,
      isUniversityAgnostic: true
    };
    (aiService.analyzeQuality as jest.Mock).mockResolvedValue(mockAnalysis);

    const content = 'John is an exceptional student with strong analytical skills and research experience.';

    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content={content}
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    // Wait for the debounced quality analysis
    await waitFor(() => {
      expect(aiService.analyzeQuality).toHaveBeenCalledWith(content);
    }, { timeout: 3000 });
  });

  it('displays quality analysis results', async () => {
    const mockAnalysis = {
      score: 8,
      strengths: ['Professional tone', 'Specific examples'],
      improvements: ['Add more metrics'],
      suggestions: ['Consider adding research achievements'],
      wordCount: 150,
      hasSpecificExamples: true,
      isProfessional: true,
      isUniversityAgnostic: true
    };
    (aiService.analyzeQuality as jest.Mock).mockResolvedValue(mockAnalysis);

    const content = 'John is an exceptional student with strong analytical skills and research experience.';

    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content={content}
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Content Quality Analysis')).toBeInTheDocument();
      expect(screen.getByText('Score: 8/10')).toBeInTheDocument();
      expect(screen.getByText('150 words')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles errors gracefully', async () => {
    (aiService.generateOutline as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(
      <AIWritingAssistant
        applicationData={mockApplicationData}
        content=""
        onContentChange={mockOnContentChange}
        onInsertText={mockOnInsertText}
      />
    );

    const generateButton = screen.getByText('Generate Outline');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});