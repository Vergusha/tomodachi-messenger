import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Crop } from '@mui/icons-material';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { processImageForUpload, validateImageFile, uploadProfileImage } from '../../utils/imageService';
import { useAuth } from '../../contexts/AuthContext';

interface AvatarEditorProps {
  open: boolean;
  onClose: () => void;
  onComplete: (url: string) => void;
}

const AvatarEditor = ({ open, onClose, onComplete }: AvatarEditorProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();
  
  // Открываем диалог выбора файла при первом открытии
  useEffect(() => {
    if (open && fileInputRef.current && !selectedFile) {
      fileInputRef.current.click();
    }
  }, [open, selectedFile]);
  
  // Очищаем состояние при закрытии
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
      setZoom(1);
      setRotation(0);
    }
  }, [open]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validationError = validateImageFile(file);
      
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };
  
  const handleZoomChange = (_: Event, newValue: number | number[]) => {
    setZoom(newValue as number);
  };
  
  const handleRotationChange = (_: Event, newValue: number | number[]) => {
    setRotation(newValue as number);
  };
  
  const handleSelectAgain = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleSave = async () => {
    if (!selectedFile || !currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Обработка изображения (обрезка и сжатие)
      const processedImage = await processImageForUpload(selectedFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85,
        aspectRatio: 1
      });
      
      // Загрузка в Firebase Storage
      const downloadUrl = await uploadProfileImage(currentUser.uid, processedImage);
      
      // Обновление профиля пользователя
      onComplete(downloadUrl);
      onClose();
    } catch (err) {
      console.error('Ошибка при сохранении аватара:', err);
      setError('Не удалось сохранить изображение. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? () => {} : onClose}
      maxWidth="sm" 
      fullWidth={true}
    >
      <DialogTitle>Обновить аватар профиля</DialogTitle>
      <DialogContent>
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {previewUrl ? (
          <>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mb: 2,
              overflow: 'hidden', 
              borderRadius: '50%',
              width: 200, 
              height: 200,
              mx: 'auto',
              border: '2px solid',
              borderColor: 'primary.main',
              position: 'relative'
            }}>
              <Box
                component="img"
                src={previewUrl}
                sx={{
                  width: `${100 * zoom}%`,
                  height: `${100 * zoom}%`,
                  objectFit: 'cover',
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s'
                }}
              />
            </Box>
            
            <Box sx={{ mt: 3, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Crop sx={{ mr: 2, color: 'primary.main' }} />
                <Typography gutterBottom>Масштаб</Typography>
              </Box>
              <Slider
                value={zoom}
                min={0.5}
                max={2}
                step={0.01}
                onChange={handleZoomChange}
                disabled={loading}
              />
            </Box>
            
            <Box sx={{ mt: 3, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RotateRightIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography gutterBottom>Поворот</Typography>
              </Box>
              <Slider
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={handleRotationChange}
                disabled={loading}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            p: 4, 
            backgroundColor: 'background.default',
            borderRadius: 2
          }}>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              Выберите изображение для аватара.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSelectAgain}
              disabled={loading}
            >
              Выбрать изображение
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
          color="inherit"
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          disabled={!previewUrl || loading}
          variant="contained"
          color="primary"
        >
          {loading ? <CircularProgress size={24} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvatarEditor;