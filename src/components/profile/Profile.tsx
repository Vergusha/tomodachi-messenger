import { useState, useEffect, ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  Grid,
  AlertTitle,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import { 
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon, 
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  PhotoCamera
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile } from '../../types';
import AvatarEditor from './AvatarEditor';

const Profile = () => {
  const { currentUser, updateUserProfile, deleteAccount } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUsername(userData.username || '');
          setDisplayName(userData.displayName || '');
          setBio(userData.bio || '');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
      setError('');
      setSuccess('');
      setUpdating(true);
      
      await updateUserProfile(displayName);
      
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // This is where we would handle image upload to storage
      // For now, just log that we'd process the image
      console.log('Image selected:', e.target.files[0].name);
    }
  };

  const handleAvatarUpdate = async (photoURL: string) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateUserProfile(currentUser?.displayName || '', photoURL);
      setSuccess(true);
    } catch (error) {
      setError('Не удалось обновить аватар');
      console.error('Ошибка при обновлении аватара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await deleteAccount(password);
      // После успешного удаления аккаунта, пользователь будет автоматически разлогинен
      // и перенаправлен на страницу входа в AuthContext
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить аккаунт';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              src={currentUser?.photoURL || ''} 
              alt={displayName || 'Profile'}
              sx={{ 
                width: 120, 
                height: 120, 
                border: '4px solid', 
                borderColor: 'primary.main' 
              }}
            >
              {(displayName || '').charAt(0)}
            </Avatar>
            <IconButton 
              color="primary"
              aria-label="upload picture"
              component="label"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'secondary.main',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                }
              }}
              onClick={() => setShowAvatarEditor(true)}
            >
              <PhotoCameraIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ ml: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {displayName || username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              @{username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {currentUser?.email}
            </Typography>
          </Box>
        </Box>
        
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Divider sx={{ mb: 3, mt: 2 }} />
        
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Profile Information
          </Typography>
          
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            disabled
            helperText="Username cannot be changed"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            multiline
            rows={4}
            sx={{ mb: 3 }}
          />
          
          <Button 
            type="submit" 
            variant="contained"
            color="primary"
            disabled={updating}
            sx={{ 
              py: 1.5,
              px: 4,
              fontWeight: 'medium'
            }}
          >
            {updating ? <CircularProgress size={24} color="inherit" /> : 'Update Profile'}
          </Button>
        </form>

        <Divider sx={{ my: 4 }} />
        
        <Box>
          <Typography variant="h6" color="error" gutterBottom>
            Опасная зона
          </Typography>
          
          <Typography variant="body2" paragraph color="text.secondary">
            Удаление аккаунта - необратимое действие. Все ваши данные, сообщения и настройки будут удалены навсегда.
          </Typography>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteDialog(true)}
          >
            Удалить аккаунт
          </Button>
        </Box>
      </Paper>
      
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Подтверждение удаления аккаунта</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Вы уверены, что хотите удалить свой аккаунт? Это действие невозможно отменить.
            Все ваши данные, чаты и сообщения будут удалены навсегда.
          </DialogContentText>
          
          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="delete-password">Введите пароль для подтверждения</InputLabel>
            <OutlinedInput
              id="delete-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="переключить видимость пароля"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Введите пароль для подтверждения"
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            color="error"
            disabled={!password || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Удалить аккаунт
          </Button>
        </DialogActions>
      </Dialog>
      
      <AvatarEditor
        open={showAvatarEditor}
        onClose={() => setShowAvatarEditor(false)}
        onComplete={handleAvatarUpdate}
      />
    </Box>
  );
};

export default Profile;