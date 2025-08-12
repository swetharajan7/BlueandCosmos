import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Alert,
  InputAdornment,
  Paper,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  IconButton,
  Collapse,
  CircularProgress
} from '@mui/material';
import { 
  Search, 
  School, 
  FilterList, 
  Clear,
  ExpandMore,
  ExpandLess,
  Star,
  Public,
  Business,
  Science
} from '@mui/icons-material';
import { ApplicationForm, University } from '../../../types';
import { universityService, UniversityFilters } from '../../../services/universityService';

interface UniversitySelectionStepProps {
  data: ApplicationForm;
  universities: University[];
  onChange: (data: Partial<ApplicationForm>) => void;
}

interface UniversityCategories {
  ivy_league: University[];
  top_public: University[];
  top_private: University[];
  specialized: University[];
}

const UniversitySelectionStep: React.FC<UniversitySelectionStepProps> = ({
  data,
  universities,
  onChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>(universities);
  const [submissionFilter, setSubmissionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<UniversityCategories | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchUniversities = useCallback(async (term: string, filters: UniversityFilters) => {
    setLoading(true);
    try {
      const results = await universityService.getUniversities({
        search: term.trim() || undefined,
        program_type: data.program_type || undefined,
        submission_format: filters.submission_format !== 'all' ? filters.submission_format : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
      });
      setFilteredUniversities(results);
    } catch (error) {
      console.error('Error searching universities:', error);
      // Fallback to client-side filtering if API fails
      setFilteredUniversities(universities);
    } finally {
      setLoading(false);
    }
  }, [data.program_type, universities]);

  // Effect for handling search and filter changes with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchUniversities(searchTerm, {
        submission_format: submissionFilter,
        category: categoryFilter,
      });
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchTerm, submissionFilter, categoryFilter, searchUniversities]);

  // Initial load
  useEffect(() => {
    searchUniversities('', {
      submission_format: 'all',
      category: 'all',
    });
  }, [searchUniversities]);

  const selectedUniversityIds = data.universities.map(u => 
    typeof u === 'string' ? u : u.id
  );

  const handleUniversityToggle = async (university: University) => {
    const isSelected = selectedUniversityIds.includes(university.id);
    let newUniversities;

    if (isSelected) {
      newUniversities = data.universities.filter(u => 
        (typeof u === 'string' ? u : u.id) !== university.id
      );
    } else {
      if (data.universities.length >= 20) {
        return; // Don't allow more than 20 universities
      }

      // Validate program availability for this university
      if (data.program_type) {
        try {
          const validation = await universityService.validateProgramAvailability(
            [university.id], 
            data.program_type
          );
          
          if (validation.unavailable.includes(university.id)) {
            // Show warning but still allow selection
            console.warn(`University ${university.name} may not support ${data.program_type} programs`);
          }
        } catch (error) {
          console.error('Error validating program availability:', error);
        }
      }

      newUniversities = [...data.universities, university];
    }

    onChange({ universities: newUniversities });
  };

  const getSelectedUniversities = (): University[] => {
    return data.universities.map(u => {
      if (typeof u === 'string') {
        return universities.find(uni => uni.id === u);
      }
      return u;
    }).filter(Boolean) as University[];
  };

  const selectedUniversities = getSelectedUniversities();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ivy_league':
        return <Star color="warning" />;
      case 'top_public':
        return <Public color="primary" />;
      case 'specialized':
        return <Science color="secondary" />;
      default:
        return <School color="action" />;
    }
  };

  const getUniversityCategory = (university: University): string => {
    if (['HARVARD', 'YALE', 'PRINCETON', 'COLUMBIA', 'UPENN', 'CORNELL', 'BROWN', 'DARTMOUTH'].includes(university.code)) {
      return 'ivy_league';
    }
    if (['UCB', 'UCLA', 'UMICH', 'UVA', 'UNC', 'GATECH', 'UW', 'UIUC'].includes(university.code)) {
      return 'top_public';
    }
    if (['MIT', 'CALTECH', 'CMU', 'JHU'].includes(university.code)) {
      return 'specialized';
    }
    return 'other';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSubmissionFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = searchTerm.trim() || submissionFilter !== 'all' || categoryFilter !== 'all';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Universities
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the universities where you want to apply. You can select up to 20 universities.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>One recommendation, multiple universities:</strong> Your recommender will write one 
          letter that will be automatically submitted to all selected universities.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Selected Universities */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 500 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">
                Selected Universities
              </Typography>
              <Badge badgeContent={selectedUniversities.length} color="primary" max={20}>
                <School />
              </Badge>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedUniversities.length}/20 universities selected
            </Typography>
            
            {selectedUniversities.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <School sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="body2">
                  No universities selected yet
                </Typography>
                <Typography variant="caption">
                  Search and select universities from the list
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {selectedUniversities.map((university) => {
                  const category = getUniversityCategory(university);
                  return (
                    <Tooltip key={university.id} title={`${university.name} (${university.code})`}>
                      <Chip
                        icon={getCategoryIcon(category)}
                        label={university.name.length > 25 ? `${university.name.substring(0, 25)}...` : university.name}
                        onDelete={() => handleUniversityToggle(university)}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* University Search and List */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 500 }}>
            {/* Search and Filters */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search universities by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />

              {/* Filter Toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => setShowFilters(!showFilters)}
                    color={hasActiveFilters ? 'primary' : 'default'}
                  >
                    <FilterList />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    Filters
                  </Typography>
                  {hasActiveFilters && (
                    <Chip 
                      label="Clear" 
                      size="small" 
                      variant="outlined" 
                      onClick={clearFilters}
                      onDelete={clearFilters}
                    />
                  )}
                </Box>
                <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              {/* Collapsible Filters */}
              <Collapse in={showFilters}>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={categoryFilter}
                      label="Category"
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      <MenuItem value="ivy_league">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Star color="warning" fontSize="small" />
                          Ivy League
                        </Box>
                      </MenuItem>
                      <MenuItem value="top_public">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Public color="primary" fontSize="small" />
                          Top Public
                        </Box>
                      </MenuItem>
                      <MenuItem value="specialized">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Science color="secondary" fontSize="small" />
                          Specialized
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Submission</InputLabel>
                    <Select
                      value={submissionFilter}
                      label="Submission"
                      onChange={(e) => setSubmissionFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Methods</MenuItem>
                      <MenuItem value="api">API Integration</MenuItem>
                      <MenuItem value="email">Email Submission</MenuItem>
                      <MenuItem value="manual">Manual Process</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Collapse>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Available Universities ({filteredUniversities.length})
            </Typography>

            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {!loading && filteredUniversities.map((university, index) => {
                const isSelected = selectedUniversityIds.includes(university.id);
                const isDisabled = !isSelected && selectedUniversities.length >= 20;
                const category = getUniversityCategory(university);

                return (
                  <React.Fragment key={university.id}>
                    <ListItem
                      onClick={() => !isDisabled && handleUniversityToggle(university)}
                      sx={{
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'default' : 'pointer',
                        '&:hover': {
                          backgroundColor: isDisabled ? 'transparent' : 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ mr: 1 }}>
                        {getCategoryIcon(category)}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                              {university.name}
                            </Typography>
                            {isSelected && (
                              <Chip label="Selected" size="small" color="primary" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Code: {university.code} • {university.submission_format.toUpperCase()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Checkbox
                          edge="end"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && handleUniversityToggle(university)}
                          color="primary"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < filteredUniversities.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>

            {!loading && filteredUniversities.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Search sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="body2">
                  No universities found
                </Typography>
                <Typography variant="caption">
                  {searchTerm ? `Try different search terms or clear filters` : 'Adjust your filters'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {selectedUniversities.length >= 20 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You have reached the maximum limit of 20 universities. Remove some selections to add others.
        </Alert>
      )}

      {selectedUniversities.length === 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Please select at least one university to continue.
        </Alert>
      )}
    </Box>
  );
};

export default UniversitySelectionStep;