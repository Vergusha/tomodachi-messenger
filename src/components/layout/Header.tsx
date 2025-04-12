import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Avatar, 
  Box, 
  Menu, 
  MenuItem, 
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ExitToApp as LogoutIcon, 
  PersonOutline as ProfileIcon, 
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Notifications as NotificationIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../App';

interface HeaderProps {
  openMobileMenu?: () => void;
}

const Header = ({ openMobileMenu }: HeaderProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { toggleColorMode, mode } = useThemeContext();
  
  const isDarkMode = mode === 'dark';
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
    handleMenuClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  return (
    <AppBar 
      position="static" 
      color="primary" 
      elevation={3}
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        backgroundImage: isDarkMode
          ? `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
          : `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
      }}
    >
      <Toolbar sx={{ px: isMobile ? 1 : 2 }}>
        {isMobile && openMobileMenu && (
          <IconButton 
            color="inherit" 
            edge="start" 
            onClick={openMobileMenu}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          component="h1" 
          sx={{ 
            fontWeight: 'bold',
            flexGrow: 1,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            letterSpacing: '0.5px',
            textShadow: isDarkMode ? '1px 1px 2px rgba(0,0,0,0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => navigate('/')}
        >
          Tomodachi
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
            <IconButton 
              color="inherit" 
              onClick={toggleColorMode}
              sx={{ 
                mr: { xs: 0.5, sm: 1 },
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'rotate(30deg)'
                }
              }}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit"
                sx={{ mr: 1 }}
              >
                <NotificationIcon />
              </IconButton>
            </Tooltip>
          )}

          <IconButton 
            onClick={handleMenuOpen}
            size="small"
            sx={{ 
              ml: { xs: 0.5, sm: 1 }
            }}
            aria-label="account menu"
            aria-controls="user-menu"
            aria-haspopup="true"
          >
            <Avatar 
              src={currentUser?.photoURL || ''} 
              alt={currentUser?.displayName || 'User'}
              sx={{ 
                width: isMobile ? 34 : 40, 
                height: isMobile ? 34 : 40,
                border: `2px solid ${theme.palette.secondary.main}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.5)'
                }
              }}
            >
              {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
            </Avatar>
          </IconButton>
          
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              elevation: 3,
              sx: { 
                minWidth: 200,
                borderRadius: 2,
                mt: 0.5,
                overflow: 'visible',
                boxShadow: isDarkMode 
                  ? '0 4px 20px rgba(0,0,0,0.3)'
                  : '0 2px 10px rgba(0,0,0,0.1)',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ py: 1, px: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {currentUser?.displayName || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {currentUser?.email}
              </Typography>
            </Box>
            
            <Divider />
            
            <MenuItem 
              onClick={handleProfile} 
              sx={{ 
                py: 1.5,
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'
                }
              }}
            >
              <ProfileIcon sx={{ mr: 2 }} />
              Мой профиль
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={handleLogout} 
              sx={{ 
                py: 1.5,
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,20,60,0.1)' : 'rgba(255,0,0,0.04)'
                }
              }}
            >
              <LogoutIcon sx={{ mr: 2 }} />
              Выйти
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;