import React from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationWizard from '../components/student/ApplicationWizard';
import { Application } from '../types';

const CreateApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = (application: Application) => {
    // Navigate to the application detail page or dashboard
    navigate('/dashboard', { 
      state: { 
        message: 'Application created successfully!',
        type: 'success'
      }
    });
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <ApplicationWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default CreateApplicationPage;