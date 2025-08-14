import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import ApplicationWizard from '../ApplicationWizard';
import authSlice from '../../../store/authSlice';
import { applicationService } from '../../../services/applicationService';
import { universityService } from '../../../services/universityService';

// Mock services
jest.mock('../../../services/applicationService', () => ({
  applicationService: {
    createApplication: jest.fn(),
    updateApplication: jest.fn(),
  }
}));

jest.mock('../../../services/universityService', () => ({
  universityService: {
    getUniversities: jest.fn(),
  }
}));

const mockUniversities = [
  { id: 'harvard', name: 'Harvard University', code: 'HARVARD' },
  { id: 'mit', name: 'Massachusetts Institute of Technology', code: 'MIT' },
  { id: 'stanford', name: 'Stanford University', code: 'STANFORD' }
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
        tokens: { accessToken: 'token123', refreshToken: 'refresh123' },
        isLoading: false,
        error: null
      }
    }
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ApplicationWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (universityService.getUniversities as jest.Mock).mockResolvedValue(mockUniversities);
  });

  it('renders the first step (Basic Info)', async () => {
    renderWithProviders(<ApplicationWizard />);

    await waitFor(() => {
      expect(screen.getByText(/basic information/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/legal name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/program type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/application term/i)).toBeInTheDocument();
    });
  });

  it('validates basic information step', async () => {
    renderWithProviders(<ApplicationWizard />);

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/legal name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/program type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/application term is required/i)).toBeInTheDocument();
    });
  });

  it('progresses to university selection step', async () => {
    renderWithProviders(<ApplicationWizard />);

    await waitFor(() => {
      // Fill basic info
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/select universities/i)).toBeInTheDocument();
      expect(screen.getByText(/harvard university/i)).toBeInTheDocument();
      expect(screen.getByText(/massachusetts institute of technology/i)).toBeInTheDocument();
    });
  });

  it('allows university selection', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Navigate to university selection
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      // Select universities
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      const mitCheckbox = screen.getByRole('checkbox', { name: /massachusetts institute of technology/i });

      fireEvent.click(harvardCheckbox);
      fireEvent.click(mitCheckbox);

      expect(harvardCheckbox).toBeChecked();
      expect(mitCheckbox).toBeChecked();
    });
  });

  it('validates university selection', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Navigate to university selection
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      // Try to proceed without selecting universities
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/select at least one university/i)).toBeInTheDocument();
    });
  });

  it('progresses to recommender step', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Complete basic info and university selection
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      fireEvent.click(harvardCheckbox);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/recommender information/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recommender email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recommender name/i)).toBeInTheDocument();
    });
  });

  it('validates recommender information', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Navigate to recommender step
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      fireEvent.click(harvardCheckbox);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      // Try to proceed without recommender info
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/recommender email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/recommender name is required/i)).toBeInTheDocument();
    });
  });

  it('shows review step with all information', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Complete all steps
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      fireEvent.click(harvardCheckbox);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/recommender email/i), {
        target: { value: 'prof@university.edu' }
      });
      fireEvent.change(screen.getByLabelText(/recommender name/i), {
        target: { value: 'Professor Smith' }
      });
      fireEvent.change(screen.getByLabelText(/relationship type/i), {
        target: { value: 'Academic Advisor' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/review application/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/graduate/i)).toBeInTheDocument();
      expect(screen.getByText(/fall 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/harvard university/i)).toBeInTheDocument();
      expect(screen.getByText(/professor smith/i)).toBeInTheDocument();
    });
  });

  it('submits application successfully', async () => {
    const mockApplication = {
      id: 'app123',
      legal_name: 'John Doe',
      universities: ['harvard'],
      program_type: 'graduate',
      application_term: 'Fall 2024'
    };

    (applicationService.createApplication as jest.Mock).mockResolvedValue(mockApplication);

    renderWithProviders(<ApplicationWizard />);

    // Complete all steps and submit
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      fireEvent.click(harvardCheckbox);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/recommender email/i), {
        target: { value: 'prof@university.edu' }
      });
      fireEvent.change(screen.getByLabelText(/recommender name/i), {
        target: { value: 'Professor Smith' }
      });
      fireEvent.change(screen.getByLabelText(/relationship type/i), {
        target: { value: 'Academic Advisor' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /submit application/i });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(applicationService.createApplication).toHaveBeenCalledWith({
        legal_name: 'John Doe',
        universities: ['harvard'],
        program_type: 'graduate',
        application_term: 'Fall 2024',
        recommender_email: 'prof@university.edu',
        recommender_name: 'Professor Smith',
        relationship_type: 'Academic Advisor'
      });
    });
  });

  it('handles submission errors', async () => {
    const errorMessage = 'Failed to create application';
    (applicationService.createApplication as jest.Mock).mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<ApplicationWizard />);

    // Complete all steps and submit
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const harvardCheckbox = screen.getByRole('checkbox', { name: /harvard university/i });
      fireEvent.click(harvardCheckbox);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/recommender email/i), {
        target: { value: 'prof@university.edu' }
      });
      fireEvent.change(screen.getByLabelText(/recommender name/i), {
        target: { value: 'Professor Smith' }
      });
      fireEvent.change(screen.getByLabelText(/relationship type/i), {
        target: { value: 'Academic Advisor' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /submit application/i });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('allows navigation between steps', async () => {
    renderWithProviders(<ApplicationWizard />);

    // Go to step 2
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/legal name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/program type/i), {
        target: { value: 'graduate' }
      });
      fireEvent.change(screen.getByLabelText(/application term/i), {
        target: { value: 'Fall 2024' }
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/select universities/i)).toBeInTheDocument();
      
      // Go back to step 1
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/basic information/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });
  });
});