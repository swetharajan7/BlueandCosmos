import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApplicationStatusDashboard from '../components/student/ApplicationStatusDashboard';

const ApplicationStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!id) {
    navigate('/dashboard');
    return null;
  }

  return (
    <ApplicationStatusDashboard
      applicationId={id}
      onBack={handleBack}
    />
  );
};

export default ApplicationStatusPage;