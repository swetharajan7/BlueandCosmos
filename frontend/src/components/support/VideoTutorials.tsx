import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  VideoLibrary as VideoIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'getting-started' | 'application' | 'recommender' | 'writing' | 'technical' | 'advanced';
  audience: 'student' | 'recommender' | 'both';
  thumbnail: string;
  videoUrl: string;
  transcript?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface VideoTutorialsProps {
  userRole?: 'student' | 'recommender' | 'admin';
}

const VideoTutorials: React.FC<VideoTutorialsProps> = ({
  userRole = 'student'
}) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock video data - in production, this would come from an API
  const tutorials: VideoTutorial[] = [
    {
      id: '1',
      title: 'Getting Started with StellarRec™',
      description: 'A comprehensive overview of the platform for new students',
      duration: '5:30',
      category: 'getting-started',
      audience: 'student',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video1',
      tags: ['overview', 'registration', 'basics'],
      difficulty: 'beginner'
    },
    {
      id: '2',
      title: 'Creating Your First Application',
      description: 'Step-by-step guide through the application wizard',
      duration: '8:15',
      category: 'application',
      audience: 'student',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video2',
      tags: ['application', 'wizard', 'universities'],
      difficulty: 'beginner'
    },
    {
      id: '3',
      title: 'Using the AI Writing Assistant',
      description: 'How to effectively use AI tools while maintaining authenticity',
      duration: '6:45',
      category: 'writing',
      audience: 'recommender',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video3',
      tags: ['ai', 'writing', 'assistant', 'recommendations'],
      difficulty: 'intermediate'
    },
    {
      id: '4',
      title: 'Managing Multiple Applications',
      description: 'Organizing and tracking applications to multiple universities',
      duration: '4:20',
      category: 'application',
      audience: 'student',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video4',
      tags: ['organization', 'tracking', 'multiple'],
      difficulty: 'intermediate'
    },
    {
      id: '5',
      title: 'Writing Effective Recommendations',
      description: 'Best practices for creating compelling recommendation letters',
      duration: '9:10',
      category: 'writing',
      audience: 'recommender',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video5',
      tags: ['best-practices', 'writing', 'quality'],
      difficulty: 'intermediate'
    },
    {
      id: '6',
      title: 'Troubleshooting Common Issues',
      description: 'Solutions to frequently encountered problems',
      duration: '7:30',
      category: 'technical',
      audience: 'both',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/video6',
      tags: ['troubleshooting', 'problems', 'solutions'],
      difficulty: 'beginner'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Videos', icon: <VideoIcon /> },
    { value: 'getting-started', label: 'Getting Started', icon: <PersonIcon /> },
    { value: 'application', label: 'Applications', icon: <SchoolIcon /> },
    { value: 'writing', label: 'Writing', icon: <VideoIcon /> },
    { value: 'technical', label: 'Technical', icon: <SettingsIcon /> }
  ];

  // Filter tutorials based on user role, search, and category
  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesRole = tutorial.audience === 'both' || tutorial.audience === userRole;
    const matchesSearch = !searchQuery || 
      tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorial.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || tutorial.category === categoryFilter;
    
    return matchesRole && matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleVideoSelect = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  const tabContent = [
    { label: 'All Tutorials', content: filteredTutorials },
    { label: 'Recommended', content: filteredTutorials.filter(t => t.difficulty === 'beginner') },
    { label: 'Recently Added', content: filteredTutorials.slice(0, 3) }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <VideoIcon sx={{ mr: 1 }} />
        Video Tutorials
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Learn how to use StellarRec™ effectively with our comprehensive video library.
      </Typography>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tutorials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <Chip
              key={category.value}
              icon={category.icon}
              label={category.label}
              onClick={() => setCategoryFilter(category.value)}
              color={categoryFilter === category.value ? 'primary' : 'default'}
              variant={categoryFilter === category.value ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        {tabContent.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>

      {/* Video Grid */}
      <Grid container spacing={3}>
        {tabContent[activeTab].content.map((tutorial) => (
          <Grid item xs={12} sm={6} md={4} key={tutorial.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleVideoSelect(tutorial)}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="180"
                  image={tutorial.thumbnail}
                  alt={tutorial.title}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PlayIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Chip
                  label={tutorial.duration}
                  size="small"
                  icon={<TimeIcon />}
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white'
                  }}
                />
              </Box>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {tutorial.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tutorial.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={tutorial.difficulty}
                    size="small"
                    color={getDifficultyColor(tutorial.difficulty) as any}
                    variant="outlined"
                  />
                  {tutorial.tags.slice(0, 2).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTutorials.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <VideoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tutorials found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter criteria.
          </Typography>
        </Box>
      )}

      {/* Video Player Dialog */}
      <Dialog
        open={!!selectedVideo}
        onClose={handleCloseVideo}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        {selectedVideo && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {selectedVideo.title}
                </Typography>
                <IconButton onClick={handleCloseVideo}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={selectedVideo.videoUrl}
                  title={selectedVideo.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allowFullScreen
                />
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {selectedVideo.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {selectedVideo.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseVideo}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default VideoTutorials;