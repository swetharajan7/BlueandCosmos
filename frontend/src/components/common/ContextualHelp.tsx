import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  Help as HelpIcon,
  QuestionAnswer,
  VideoLibrary,
  Description
} from '@mui/icons-material';

interface ContextualHelpProps {
  context: string;
  userRole?: 'student' | 'recommender' | 'admin';
}

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'faq' | 'video' | 'guide';
  action: () => void;
}

const ContextualHelp: React.FC<ContextualHelpProps> = ({
  context,
  userRole = 'student'
}) => {
  const [open, setOpen] = useState(false);

  // Context-specific help content
  const getContextualHelp = (): HelpItem[] => {
    const baseHelp: Record<string, HelpItem[]> = {
      'registration': [
        {
          id: 'reg-1',
          title: 'Account Creation',
          description: 'Learn how to create and verify your account',
          type: 'faq',
          action: () => console.log('Show registration FAQ')
        },
        {
          id: 'reg-2',
          title: 'Registration Walkthrough',
          description: '3-minute video showing the registration process',
          type: 'video',
          action: () => console.log('Show registration video')
        }
      ],
      'application': [
        {
          id: 'app-1',
          title: 'Creating Applications',
          description: 'Step-by-step guide to creating your application',
          type: 'guide',
          action: () => console.log('Show application guide')
        },
        {
          id: 'app-2',
          title: 'University Selection Tips',
          description: 'How to choose the right universities for your goals',
          type: 'faq',
          action: () => console.log('Show university selection FAQ')
        },
        {
          id: 'app-3',
          title: 'Application Wizard Demo',
          description: 'Watch how to use the application creation wizard',
          type: 'video',
          action: () => console.log('Show application video')
        }
      ],
      'recommenders': [
        {
          id: 'rec-1',
          title: 'Adding Recommenders',
          description: 'How to invite and manage your recommenders',
          type: 'faq',
          action: () => console.log('Show recommender FAQ')
        },
        {
          id: 'rec-2',
          title: 'Recommender Communication',
          description: 'Best practices for working with recommenders',
          type: 'guide',
          action: () => console.log('Show communication guide')
        }
      ],
      'writing': [
        {
          id: 'wri-1',
          title: 'Using the AI Assistant',
          description: 'How to effectively use AI writing assistance',
          type: 'faq',
          action: () => console.log('Show AI FAQ')
        },
        {
          id: 'wri-2',
          title: 'Writing Best Practices',
          description: 'Guidelines for writing effective recommendations',
          type: 'guide',
          action: () => console.log('Show writing guide')
        },
        {
          id: 'wri-3',
          title: 'AI Writing Tutorial',
          description: 'Video demonstration of the AI writing features',
          type: 'video',
          action: () => console.log('Show writing video')
        }
      ],
      'status': [
        {
          id: 'sta-1',
          title: 'Understanding Status Indicators',
          description: 'What the different status colors and icons mean',
          type: 'faq',
          action: () => console.log('Show status FAQ')
        },
        {
          id: 'sta-2',
          title: 'Tracking Your Applications',
          description: 'How to monitor your application progress',
          type: 'guide',
          action: () => console.log('Show tracking guide')
        }
      ]
    };

    return baseHelp[context] || [];
  };

  const helpItems = getContextualHelp();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'faq':
        return <QuestionAnswer />;
      case 'video':
        return <VideoLibrary />;
      case 'guide':
        return <Description />;
      default:
        return <HelpIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'faq':
        return 'primary';
      case 'video':
        return 'secondary';
      case 'guide':
        return 'success';
      default:
        return 'default';
    }
  };

  if (helpItems.length === 0) {
    return null;
  }

  return (
    <>
      <Fab
        color="primary"
        size="medium"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <HelpIcon />
      </Fab>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Help for this page
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Here are some helpful resources for what you're currently doing:
          </Typography>

          <List>
            {helpItems.map((item) => (
              <ListItem
                key={item.id}
                button
                onClick={item.action}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>
                  {getTypeIcon(item.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {item.title}
                      </Typography>
                      <Chip
                        label={item.type.toUpperCase()}
                        size="small"
                        color={getTypeColor(item.type) as any}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={item.description}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpen(false);
              // Open main help system
              console.log('Open main help system');
            }}
          >
            More Help
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContextualHelp;