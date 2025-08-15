import React from 'react';
import {
  Tooltip,
  IconButton,
  Box,
  Typography,
  Link
} from '@mui/material';
import {
  Help as HelpIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface HelpTooltipProps {
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  icon?: 'help' | 'info';
  size?: 'small' | 'medium';
  learnMoreLink?: string;
  maxWidth?: number;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  placement = 'top',
  icon = 'help',
  size = 'small',
  learnMoreLink,
  maxWidth = 300
}) => {
  const tooltipContent = (
    <Box sx={{ maxWidth }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mb: learnMoreLink ? 1 : 0 }}>
        {content}
      </Typography>
      {learnMoreLink && (
        <Link
          href={learnMoreLink}
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          sx={{ display: 'block', mt: 1 }}
        >
          Learn more →
        </Link>
      )}
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      placement={placement}
      arrow
      enterDelay={500}
      leaveDelay={200}
    >
      <IconButton
        size={size}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main'
          }
        }}
      >
        {icon === 'help' ? <HelpIcon fontSize="small" /> : <InfoIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

export default HelpTooltip;