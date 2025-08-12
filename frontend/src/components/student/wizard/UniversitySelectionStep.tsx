import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import { Search, School } from '@mui/icons-material';
import { ApplicationForm, University } from '../../../types';

interface UniversitySelectionStepProps {
  data: ApplicationForm;
  universities: University[];
  onChange: (data: Partial<ApplicationForm>) => void;
}

const UniversitySelectionStep: React.FC<UniversitySelectionStepProps> = ({
  data,
  universities,
  onChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>(universities);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUniversities(universities);
    } else {
      const filtered = universities.filter(university =>
        university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        university.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUniversities(filtered);
    }
  }, [searchTerm, universities]);

  const selectedUniversityIds = data.universities.map(u => 
    typeof u === 'string' ? u : u.id
  );

  const handleUniversityToggle = (university: University) => {
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
          <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Universities ({selectedUniversities.length}/20)
            </Typography>
            
            {selectedUniversities.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <School sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="body2">
                  No universities selected yet
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {selectedUniversities.map((university) => (
                  <Chip
                    key={university.id}
                    label={university.name}
                    onDelete={() => handleUniversityToggle(university)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* University Search and List */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
            <TextField
              fullWidth
              placeholder="Search universities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle1" gutterBottom>
              Available Universities ({filteredUniversities.length})
            </Typography>

            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {filteredUniversities.map((university, index) => {
                const isSelected = selectedUniversityIds.includes(university.id);
                const isDisabled = !isSelected && selectedUniversities.length >= 20;

                return (
                  <React.Fragment key={university.id}>
                    <ListItem
                      button
                      onClick={() => !isDisabled && handleUniversityToggle(university)}
                      disabled={isDisabled}
                      sx={{
                        opacity: isDisabled ? 0.5 : 1,
                        '&:hover': {
                          backgroundColor: isDisabled ? 'transparent' : 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={university.name}
                        secondary={`Code: ${university.code}`}
                      />
                      <ListItemSecondaryAction>
                        <Checkbox
                          edge="end"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && handleUniversityToggle(university)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < filteredUniversities.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>

            {filteredUniversities.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body2">
                  No universities found matching "{searchTerm}"
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