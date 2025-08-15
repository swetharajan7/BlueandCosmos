import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert
} from '@mui/material';
import {
  Support as SupportIcon,
  QuestionAnswer as FAQIcon,
  VideoLibrary as VideoIcon,
  ContactSupport as ContactIcon,
  Description as GuideIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

import HelpSystem from '../components/common/HelpSystem';
import SupportTicketList from '../components/support/SupportTicketList';
import SupportTicketDetail from '../components/support/SupportTicketDetail';
import SupportTicketForm from '../components/support/SupportTicketForm';
import VideoTutorials from '../components/support/VideoTutorials';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`support-tabpanel-${index}`}
      aria-labelledby={`support-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SupportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showHelpSystem, setShowHelpSystem] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role || 'student';

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Reset ticket selection when changing tabs
    setSelectedTicketId(null);
  };

  const handleCreateTicket = () => {
    setShowTicketForm(true);
  };

  const handleTicketSubmit = async (ticketData: any) => {
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error('Failed to create support ticket');
      }

      // Refresh the tickets list by switching to support tab
      setActiveTab(0);
      setShowTicketForm(false);
    } catch (error) {
      throw error;
    }
  };

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
  };

  const tabs = [
    {
      label: 'Support Tickets',
      icon: <ContactIcon />,
      description: 'Create and manage your support requests'
    },
    {
      label: 'Video Tutorials',
      icon: <VideoIcon />,
      description: 'Learn with step-by-step video guides'
    },
    {
      label: 'Help & FAQ',
      icon: <FAQIcon />,
      description: 'Find answers to common questions'
    },
    {
      label: 'User Guides',
      icon: <GuideIcon />,
      description: 'Comprehensive documentation and guides'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SupportIcon sx={{ mr: 2, fontSize: 'inherit' }} />
          Help & Support
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Get the help you need to make the most of StellarRec™
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minHeight: 72 }}
              />
            ))}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            {selectedTicketId ? (
              <SupportTicketDetail
                ticketId={selectedTicketId}
                onBack={handleBackToTickets}
              />
            ) : (
              <SupportTicketList
                onCreateTicket={handleCreateTicket}
                onViewTicket={handleViewTicket}
              />
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <VideoTutorials userRole={userRole as any} />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Frequently Asked Questions
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Find quick answers to common questions about using StellarRec™.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                For more comprehensive help, click the "Open Help System" button below to access our interactive help system.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <button
                  onClick={() => setShowHelpSystem(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Open Help System
                </button>
              </Box>

              {/* Quick FAQ Preview */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Answers
                </Typography>
                
                {userRole === 'student' ? (
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How do I create an application?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use the application wizard in your dashboard to create applications step by step.
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How do I add recommenders?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In your application, click "Add Recommender" and enter their email address to send an invitation.
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How do I track my application status?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your dashboard shows real-time status with green checkmarks for successful submissions.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How do I access the platform?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click the secure link in the invitation email from your student. No account creation required.
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How long should my recommendation be?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The platform enforces a 1000-word limit. Most effective recommendations are 600-800 words.
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      How does the AI assistant work?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The AI provides suggestions for structure and improvements while maintaining your authentic voice.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Box>
              <Typography variant="h5" gutterBottom>
                User Guides & Documentation
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Comprehensive guides to help you master every aspect of StellarRec™.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>
                    {userRole === 'student' ? 'Student User Guide' : 'Recommender User Guide'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete guide covering all features and best practices for {userRole}s.
                  </Typography>
                  <button
                    onClick={() => window.open(`/docs/user-guides/${userRole}-guide.md`, '_blank')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    View Guide
                  </button>
                </Paper>

                <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>
                    FAQ Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Searchable database of frequently asked questions and answers.
                  </Typography>
                  <button
                    onClick={() => window.open(`/docs/faq/${userRole}-faq.md`, '_blank')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Browse FAQ
                  </button>
                </Paper>

                <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>
                    Video Tutorial Library
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete catalog of video tutorials organized by topic and skill level.
                  </Typography>
                  <button
                    onClick={() => setActiveTab(1)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Watch Videos
                  </button>
                </Paper>

                <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>
                    Best Practices Guide
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tips and strategies for getting the most out of the platform.
                  </Typography>
                  <button
                    onClick={() => setShowHelpSystem(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Learn More
                  </button>
                </Paper>
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Box>

      {/* Support Ticket Form Dialog */}
      <SupportTicketForm
        open={showTicketForm}
        onClose={() => setShowTicketForm(false)}
        onSubmit={handleTicketSubmit}
        context={{
          page: 'support',
          userRole,
          timestamp: new Date().toISOString()
        }}
      />

      {/* Help System Dialog */}
      <HelpSystem
        open={showHelpSystem}
        onClose={() => setShowHelpSystem(false)}
        context="support"
        userRole={userRole as any}
      />
    </Container>
  );
};

export default SupportPage;