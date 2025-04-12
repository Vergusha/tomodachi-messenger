import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress
} from '@mui/material';
import { useState } from 'react';
import { deleteChat } from '../../lib/userService';
import { useNavigate } from 'react-router-dom';

interface DeleteChatDialogProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

export const DeleteChatDialog = ({ open, onClose, chatId }: DeleteChatDialogProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteChat(chatId);
      navigate('/chat'); // Возвращаемся к списку чатов
      onClose();
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Удалить чат</DialogTitle>
      <DialogContent>
        <Typography>
          Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить, 
          и чат будет удален для всех участников.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button 
          onClick={handleDelete} 
          color="error" 
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Удаление...' : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 