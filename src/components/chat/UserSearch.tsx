import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { searchUsersByUsername, createOrGetChat } from '../../lib/userService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserSearchProps {
  open: boolean;
  onClose: () => void;
}

export const UserSearch = ({ open, onClose }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const users = await searchUsersByUsername(searchQuery);
      // Фильтруем текущего пользователя из результатов
      setSearchResults(users.filter(user => user.id !== currentUser?.uid));
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Не удалось найти пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const chatId = await createOrGetChat(currentUser.uid, userId);
      // Исправлено: используем navigate('/') и onClose, чтобы не было некорректного роута
      onClose();
      navigate('/');
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Не удалось начать чат');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Найти пользователя</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            label="Поиск по имени пользователя"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            Поиск
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {searchResults.map((user) => (
              <ListItem
                key={user.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    onClick={() => handleStartChat(user.id)}
                  >
                    Написать
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar src={user.photoURL} alt={user.displayName}>
                    {user.displayName?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.displayName}
                  secondary={user.email}
                />
              </ListItem>
            ))}
            {searchResults.length === 0 && searchQuery && !loading && (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                Пользователи не найдены
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};