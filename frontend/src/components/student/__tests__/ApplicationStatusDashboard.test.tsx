import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ApplicationStatusDashboard from '../ApplicationStatusDashboard';
import { applicationService } from '../../../services/applicationService';
import authSlice from '../../../store/authSlice';

// Mock the application service
jest.mock('../../../services/applicationService');
const mockApplicationService = applicationService as jest.Mocked<typeof applicationService>;

// Mock the WebSocket hook
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    emit: jest.fn()
  })
}));

const mockStore = configureStore({
  reducer: {
    auth: authSlice
  },
  preloadedState: {
    auth: {
      user: {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'student',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null
    }
  }
});

const mockStatusData = {
  application: {
    id: '1',
    student_id: '1',
    legal_name: 'Test Student',
    universities: [
      {
        id: '1',
        name: 'Harvard University',
        code: 'HARVARD',
        submission_format: 'api' as const,
        is_active: true
      }
    ],
    program_type: 'graduate' as const,
    application_term: 'Fall 2026',
    status: 'pending' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  recommendations: [],
  overall_status: 'draft' as const,
  timeline: [
    {
      event_type: 'application_created' as const,
      timestamp: '2024-01-01T00:00:00Z',
      title: 'Application created',
      description: 'Application was created and saved as draft'
    }
  ],
  summary: {
    total_universities: 1,
    total_recommendations: 0,
    completed_submissions: 0,
    pending_submissions: 0,
    failed_submissions: 0
  }
};

describe('ApplicationStatusDashboard', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApplicationService.getApplicationStatus.mockResolvedValue(mockStatusData);
  });

  it('should render loading state initially', () => {
    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    expect(screen.getByText('Loading application status...')).toBeInTheDocument();
  });

  it('should render application status after loading', async () => {
    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Application Status')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Student • GRADUATE • Fall 2026')).toBeInTheDocument();
    expect(screen.getByText('Overall Status:')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('should display summary statistics', async () => {
    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Universities count
    });

    expect(screen.getByText('Universities')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should show no recommendations message when there are none', async () => {
    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Recommendations Yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Recommendations will appear here once recommenders submit them.')).toBeInTheDocument();
  });

  it('should handle back button click', async () => {
    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
    });

    screen.getByText('← Back to Dashboard').click();
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockApplicationService.getApplicationStatus.mockRejectedValue(new Error('API Error'));

    render(
      <Provider store={mockStore}>
        <ApplicationStatusDashboard
          applicationId="1"
          onBack={mockOnBack}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load application status. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});