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
  useMediaQuery,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  Button
} from '@mui/material';
import {
  ExitToApp as LogoutIcon, 
  PersonOutline as ProfileIcon, 
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,

  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../App';
import qrCodeImg from '../../assets/qrcode.png';

interface HeaderProps {
  openMobileMenu?: () => void;
}

const DonateQRCode = () => (
  <Box sx={{ textAlign: 'center', p: 2 }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Premium-tilgang + tidlig tilgang til forbedringer</Typography>
    <a href="https://qr.vipps.no/box/cf28a56f-dc2b-46d6-99df-0e73c8b0b577/pay-in" target="_blank" rel="noopener noreferrer">
      <img
      src={qrCodeImg}
      alt="QR code for donation via Vipps"
      style={{ width: 192, height: 192, margin: '0 auto', display: 'block', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      />
    </a>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Scan with your camera or in the Vipps app
    </Typography>
  </Box>
);

const Header = ({ openMobileMenu }: HeaderProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [donateOpen, setDonateOpen] = useState(false);
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
          <Button
            color="secondary"
            variant="outlined"
            sx={{ mr: { xs: 0.5, sm: 1 }, fontWeight: 500, borderRadius: 2, textTransform: 'none' }}
            onClick={() => setDonateOpen(true)}
          >
            Premium Access
          </Button>
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

          {/* Удалена кнопка уведомлений */}

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
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
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
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <ProfileIcon fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      <Dialog open={donateOpen} onClose={() => setDonateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}> Get premium access</DialogTitle>
        <DialogContent>
          <DonateQRCode />
        </DialogContent>
      </Dialog>
    </AppBar>
  );
};

export default Header;