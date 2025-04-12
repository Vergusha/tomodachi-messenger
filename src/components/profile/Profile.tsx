import { useState, useEffect } from 'react';
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
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
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

  const handleAvatarUpdate = async (photoURL: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await updateUserProfile(currentUser?.displayName || '', photoURL);
      setSuccess('Avatar updated successfully');
      setShowAvatarEditor(false);
    } catch (error) {
      setError('Failed to update avatar');
      console.error('Error updating avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await deleteAccount(password);
      // After successful deletion, user will be automatically logged out
      // and redirected to login page by AuthContext
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
    } finally {
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
              onClick={() => setShowAvatarEditor(true)}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'secondary.main',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                }
              }}
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
            Danger Zone
          </Typography>

          <Typography variant="body2" paragraph color="text.secondary">
            Deleting your account is irreversible. All your data, messages, and settings will be permanently deleted.
          </Typography>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Account
          </Button>
        </Box>
      </Paper>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete your account? This action cannot be undone.
            All your data, chats, and messages will be permanently deleted.
          </DialogContentText>

          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="delete-password">Enter password to confirm</InputLabel>
            <OutlinedInput
              id="delete-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Enter password to confirm"
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            disabled={!password || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Delete Account
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