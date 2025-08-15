import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  QuestionAnswer,
  VideoLibrary,
  Description,
  Support
} from '@mui/icons-material';

interface HelpSystemProps {
  open: boolean;
  onClose: () => void;
  context?: string; // Current page/component context
  userRole?: 'student' | 'recommender' | 'admin';
}

interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: 'faq' | 'guide' | 'video' | 'contact';
  tags: string[];
  context?: string;
}

const HelpSystem: React.FC<HelpSystemProps> = ({
  open,
  onClose,
  context = 'general',
  userRole = 'student'
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState<HelpContent[]>([]);

  // Help content database
  const helpContent: HelpContent[] = [
    // Student FAQ
    {
      id: 'student-registration',
      title: 'How do I create an account?',
      content: 'Click "Sign Up" on the homepage, fill in your information, and verify your email address. Your account will be activated immediately after email verification.',
      category: 'faq',
      tags: ['registration', 'account', 'signup'],
      context: 'registration'
    },
    {
      id: 'add-universities',
      title: 'How do I select universities?',
      content: 'In the application wizard, browse our database of universities, use filters to narrow options, and select multiple institutions. We recommend choosing 5-10 universities.',
      category: 'faq',
      tags: ['universities', 'selection', 'application'],
      context: 'application'
    },
    {
      id: 'manage-recommenders',
      title: 'How do I add recommenders?',
      content: 'Navigate to your application dashboard, click "Add Recommender", and enter their details including name, email, and relationship to you.',
      category: 'faq',
      tags: ['recommenders', 'invitation', 'management'],
      context: 'recommenders'
    },
    {
      id: 'track-status',
      title: 'How do I track my application status?',
      content: 'Your dashboard shows real-time updates with green checkmarks for successful submissions, yellow warnings for pending items, and red alerts for issues.',
      category: 'faq',
      tags: ['status', 'tracking', 'dashboard'],
      context: 'status'
    },
    
    // Recommender FAQ
    {
      id: 'recommender-access',
      title: 'How do I access the platform as a recommender?',
      content: 'Click the secure link in the invitation email from your student. No account creation or password is required.',
      category: 'faq',
      tags: ['access', 'invitation', 'login'],
      context: 'recommender-login'
    },
    {
      id: 'writing-length',
      title: 'How long should my recommendation be?',
      content: 'The platform enforces a 1000-word limit. Most effective recommendations are 600-800 words with specific examples and concrete details.',
      category: 'faq',
      tags: ['writing', 'length', 'recommendations'],
      context: 'writing'
    },
    {
      id: 'ai-assistant',
      title: 'How does the AI writing assistant work?',
      content: 'The AI provides suggestions for structure, examples, and improvements based on best practices while maintaining your authentic voice.',
      category: 'faq',
      tags: ['ai', 'assistant', 'writing', 'help'],
      context: 'writing'
    },

    // Video Tutorials
    {
      id: 'student-onboarding-video',
      title: 'Student Platform Overview',
      content: 'A comprehensive 10-minute video walkthrough of the student portal, covering registration, application creation, and status tracking.',
      category: 'video',
      tags: ['overview', 'tutorial', 'student'],
      context: 'general'
    },
    {
      id: 'recommender-tutorial-video',
      title: 'Writing Recommendations with AI',
      content: 'Learn how to use the AI writing assistant effectively while maintaining authenticity in your recommendations.',
      category: 'video',
      tags: ['writing', 'ai', 'tutorial', 'recommender'],
      context: 'writing'
    },

    // Guides
    {
      id: 'application-strategy',
      title: 'University Application Strategy Guide',
      content: 'Best practices for selecting universities, timing your applications, and working effectively with recommenders.',
      category: 'guide',
      tags: ['strategy', 'planning', 'universities'],
      context: 'application'
    },
    {
      id: 'writing-best-practices',
      title: 'Writing Effective Recommendations',
      content: 'Guidelines for recommenders on creating compelling, specific, and impactful recommendation letters.',
      category: 'guide',
      tags: ['writing', 'best-practices', 'recommendations'],
      context: 'writing'
    }
  ];

  // Filter content based on user role, context, and search
  useEffect(() => {
    let filtered = helpContent;

    // Filter by user role
    if (userRole === 'recommender') {
      filtered = filtered.filter(item => 
        item.tags.includes('recommender') || 
        item.tags.includes('writing') || 
        item.context === 'writing' ||
        item.context === 'recommender-login'
      );
    } else if (userRole === 'student') {
      filtered = filtered.filter(item => 
        item.tags.includes('student') || 
        item.context === 'application' ||
        item.context === 'registration' ||
        item.context === 'status' ||
        item.context === 'recommenders'
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Prioritize context-relevant content
    if (context !== 'general') {
      filtered.sort((a, b) => {
        if (a.context === context && b.context !== context) return -1;
        if (b.context === context && a.context !== context) return 1;
        return 0;
      });
    }

    setFilteredContent(filtered);
  }, [searchQuery, context, userRole]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getCategoryContent = (category: string) => {
    return filteredContent.filter(item => item.category === category);
  };

  const renderFAQContent = () => (
    <Box>
      {getCategoryContent('faq').map((item) => (
        <Accordion key={item.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{item.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              {item.content}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {item.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderVideoContent = () => (
    <List>
      {getCategoryContent('video').map((item) => (
        <ListItem key={item.id} divider>
          <ListItemIcon>
            <VideoLibrary color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            secondary={item.content}
          />
          <Button variant="outlined" size="small">
            Watch
          </Button>
        </ListItem>
      ))}
    </List>
  );

  const renderGuideContent = () => (
    <List>
      {getCategoryContent('guide').map((item) => (
        <ListItem key={item.id} divider>
          <ListItemIcon>
            <Description color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            secondary={item.content}
          />
          <Button variant="outlined" size="small">
            Read
          </Button>
        </ListItem>
      ))}
    </List>
  );

  const renderContactContent = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Contact Support
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Email Support
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {userRole === 'recommender' ? 'recommender-support@stellarrec.com' : 'support@stellarrec.com'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Response within 24 hours
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Live Chat
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Available Monday-Friday, 9 AM - 6 PM EST
        </Typography>
        <Button variant="contained" size="small" sx={{ mt: 1 }}>
          Start Chat
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Phone Support
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Available for urgent issues
        </Typography>
        <Button variant="outlined" size="small" sx={{ mt: 1 }}>
          Request Callback
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Submit a Support Ticket
      </Typography>
      <Button variant="contained" color="primary" fullWidth>
        Create Support Ticket
      </Button>
    </Box>
  );

  const tabContent = [
    { label: 'FAQ', icon: <QuestionAnswer />, content: renderFAQContent() },
    { label: 'Videos', icon: <VideoLibrary />, content: renderVideoContent() },
    { label: 'Guides', icon: <Description />, content: renderGuideContent() },
    { label: 'Contact', icon: <Support />, content: renderContactContent() }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Help & Support
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <TextField
          fullWidth
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 2 }}
          size="small"
        />
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabContent.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {tabContent[activeTab].content}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpSystem;