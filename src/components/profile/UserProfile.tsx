import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import { Close as CloseIcon, Person as PersonIcon } from '@mui/icons-material';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { UserProfile as UserProfileType } from '../../types';
import { format, isToday, isYesterday } from 'date-fns';

interface UserProfileProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onStartChat?: () => void;
  isChatActive?: boolean;
}

const formatLastSeen = (lastSeen: any): string => {
  if (!lastSeen) return 'offline';
  
  try {
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'was online just now';
    if (diffInMinutes < 60) return `was online ${diffInMinutes} min ago`;
    if (isToday(date)) return `was online today at ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `was online yesterday at ${format(date, 'HH:mm')}`;
    return `was online ${format(date, 'dd.MM at HH:mm')}`;
  } catch (e) {
    return 'offline';
  }
};

const UserProfile = ({ open, onClose, userId, onStartChat, isChatActive = false }: UserProfileProps) => {
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError(null);
    // Реалтайм подписка на профиль пользователя
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (userDoc) => {
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfileType);
        setError(null);
      } else {
        setUser(null);
        setError('User not found');
      }
      setLoading(false);
    }, (err) => {
      setError('Failed to load user information');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [open, userId]);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          height: {
            xs: '100%',
            sm: 'auto'
          },
          maxHeight: {
            xs: '100%',
            sm: 600
          },
          borderRadius: {
            xs: 0,
            sm: 2
          }
        }
      }}
    >
      <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
        <IconButton onClick={onClose} color="inherit">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ p: 0, pb: 2 }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 300 
          }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            color: 'error.main'
          }}>
            <Typography variant="body1">{error}</Typography>
          </Box>
        ) : user ? (
          <Box>
            {/* Top section with large avatar */}
            <Box sx={{ 
              backgroundColor: 'primary.light',
              pt: 8,
              pb: 10,
              mb: -8,
              position: 'relative'
            }}>
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translate(-50%, 50%)',
                width: 150,
                height: 150,
                borderRadius: '50%',
                backgroundColor: 'background.paper',
                p: 0.5,
                boxShadow: 2
              }}>
                <Avatar
                  src={user.photoURL || ''}
                  sx={{ 
                    width: '100%', 
                    height: '100%',
                    fontSize: '3rem'
                  }}
                  alt={user.displayName || user.username}
                >
                  {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Box>
            </Box>
            
            {/* User information */}
            <Box sx={{ 
              px: 3,
              pt: 10,
              textAlign: 'center'
            }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {user.displayName || user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                @{user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.isOnline ? 'online' : formatLastSeen(user.lastSeen)}
              </Typography>
              
              {!isChatActive && onStartChat && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={onStartChat}
                  startIcon={<PersonIcon />}
                  sx={{ mb: 3 }}
                >
                  Start conversation
                </Button>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Profile information */}
              {user.bio ? (
                <Box sx={{ px: 2, mb: 2 }}>
                  <Typography variant="body1" align="center" paragraph>
                    {user.bio}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  User did not add information about themselves
                </Typography>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Joined Tomodachi on {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;