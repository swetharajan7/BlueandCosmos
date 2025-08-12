import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import RecommenderManager from '../RecommenderManager';

interface RecommenderStepProps {
  applicationId?: string;
  onRecommendersChange?: (count: number) => void;
}

const RecommenderStep: React.FC<RecommenderStepProps> = ({
  applicationId,
  onRecommendersChange
}) => {
  const [recommenderCount, setRecommenderCount] = useState(0);

  const handleRecommendersChange = (count: number) => {
    setRecommenderCount(count);
    onRecommendersChange?.(count);
  };

  if (!applicationId) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Invite Recommenders
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Please save your application first before inviting recommenders.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Invite Recommenders
      </Typography>
      
      <Card sx={{ mb: 3, bgcolor: 'info.50' }}>
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <InfoIcon color="info" />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                About StellarRec™ Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                With StellarRec™, your recommenders write <strong>one letter</strong> that gets 
                automatically submitted to <strong>all your selected universities</strong>. This saves 
                them time while ensuring consistent, high-quality recommendations across all your applications.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <RecommenderManager
        applicationId={applicationId}
        onRecommendersChange={handleRecommendersChange}
      />

      {recommenderCount === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Tip:</strong> Most universities require 2-3 recommendation letters. 
            We recommend inviting at least 2 recommenders to ensure your applications are complete.
          </Typography>
        </Alert>
      )}

      {recommenderCount > 0 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Great! You have {recommenderCount} recommender{recommenderCount > 1 ? 's' : ''} invited. 
            You can continue to the next step or add more recommenders if needed.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default RecommenderStep;