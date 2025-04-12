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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
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
  if (!lastSeen) return 'не в сети';
  
  try {
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'был(а) в сети только что';
    if (diffInMinutes < 60) return `был(а) в сети ${diffInMinutes} мин назад`;
    if (isToday(date)) return `был(а) в сети сегодня в ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `был(а) в сети вчера в ${format(date, 'HH:mm')}`;
    return `был(а) в сети ${format(date, 'dd.MM в HH:mm')}`;
  } catch (e) {
    return 'не в сети';
  }
};

const UserProfile = ({ open, onClose, userId, onStartChat, isChatActive = false }: UserProfileProps) => {
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfileType);
        } else {
          setError('Пользователь не найден');
        }
      } catch (err) {
        console.error('Ошибка при загрузке данных пользователя:', err);
        setError('Не удалось загрузить информацию о пользователе');
      } finally {
        setLoading(false);
      }
    };
    
    if (open && userId) {
      fetchUser();
    }
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
            {/* Верхняя часть с большой аватаркой */}
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
            
            {/* Информация о пользователе */}
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
                {user.isOnline ? 'в сети' : formatLastSeen(user.lastSeen)}
              </Typography>
              
              {!isChatActive && onStartChat && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={onStartChat}
                  startIcon={<PersonIcon />}
                  sx={{ mb: 3 }}
                >
                  Начать общение
                </Button>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Информация из профиля */}
              {user.bio ? (
                <Box sx={{ px: 2, mb: 2 }}>
                  <Typography variant="body1" align="center" paragraph>
                    {user.bio}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Пользователь не добавил информацию о себе
                </Typography>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  В Tomodachi с {new Date(user.createdAt).toLocaleDateString()}
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