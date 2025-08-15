import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logoutUser } from '../../store/authSlice';
import { Person, Settings, ExitToApp, Verified, AdminPanelSettings, Support } from '@mui/icons-material';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleDashboard = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const handleAdmin = () => {
    handleMenuClose();
    navigate('/admin');
  };

  const handleSupport = () => {
    handleMenuClose();
    navigate('/support');
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to={isAuthenticated ? "/dashboard" : "/"}
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          StellarRec™
        </Typography>
        
        {isAuthenticated && user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!user.is_verified && (
              <Chip
                label="Email not verified"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            )}
            
            <Button
              onClick={handleMenuOpen}
              sx={{ 
                color: 'white',
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'secondary.main',
                  fontSize: '0.875rem'
                }}
              >
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.first_name} {user.last_name}
                {user.is_verified && (
                  <Verified sx={{ ml: 0.5, fontSize: 16 }} />
                )}
              </Box>
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleDashboard}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={handleProfile}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile Settings</ListItemText>
              </MenuItem>

              <MenuItem onClick={handleSupport}>
                <ListItemIcon>
                  <Support fontSize="small" />
                </ListItemIcon>
                <ListItemText>Support</ListItemText>
              </MenuItem>
              
              {user.role === 'admin' && (
                <MenuItem onClick={handleAdmin}>
                  <ListItemIcon>
                    <AdminPanelSettings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Admin Dashboard</ListItemText>
                </MenuItem>
              )}
              
              <Divider />
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/login"
            >
              Login
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/register"
              variant="outlined"
              sx={{ borderColor: 'white', color: 'white' }}
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;