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
import { processImageForUpload, validateImageFile } from '../../utils/imageService';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../lib/userService';
import { Cropper } from 'react-cropper';
import { PhotoCamera } from '@mui/icons-material';
import 'cropperjs/dist/cropper.css';

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
  const [cropData, setCropData] = useState<any>(null);
  const [isCropperReady, setIsCropperReady] = useState(false);
  const cropperRef = useRef<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();
  
  // Open file selection dialog on first open
  useEffect(() => {
    if (open && fileInputRef.current && !selectedFile) {
      fileInputRef.current.click();
    }
  }, [open, selectedFile]);
  
  // Clear state on close
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setCropData(null);
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
  
  const handleSelectAgain = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleSave = async () => {
    if (!currentUser || !selectedFile || !cropperRef.current) {
      console.error('Missing required data:', { 
        currentUser, 
        selectedFile, 
        cropperRef: !!cropperRef.current,
        userId: currentUser?.uid,
        isAuthenticated: !!currentUser
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Получаем обрезанное изображение из cropper
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
        width: 300,
        height: 300
      });
      
      if (!croppedCanvas) {
        throw new Error('Не удалось получить обрезанное изображение');
      }
      
      // Конвертируем canvas в Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        croppedCanvas.toBlob((blob: Blob | null) => {
          if (blob) resolve(blob);
          else reject(new Error('Не удалось создать Blob из изображения'));
        }, 'image/jpeg', 0.85);
      });
      
      // Создаем File из Blob
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      
      // Обрабатываем изображение
      const processedImage = await processImageForUpload(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85,
        aspectRatio: 1
      });
      
      // Обновляем профиль пользователя
      const publicUrl = URL.createObjectURL(processedImage);
      // Исправлено: передаём userId, displayName, photoURL
      await updateUserProfile(currentUser.uid, currentUser.displayName || '', publicUrl);
      onComplete(publicUrl);
      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      setError('Не удалось сохранить аватар. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Редактор аватара</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          {selectedFile ? (
            <>
              <Box sx={{ position: 'relative', height: 300, mb: 2 }}>
                <Cropper
                  ref={cropperRef}
                  src={previewUrl || ''}
                  style={{ height: 300, width: '100%' }}
                  aspectRatio={1}
                  guides={true}
                  cropBoxResizable={true}
                  cropBoxMovable={true}
                  zoomable={true}
                  zoomOnWheel={true}
                  zoomOnTouch={true}
                  viewMode={1}
                  minCropBoxWidth={100}
                  minCropBoxHeight={100}
                  background={false}
                  responsive={true}
                  autoCropArea={1}
                  checkOrientation={false}
                  onInitialized={(instance) => {
                    cropperRef.current = instance;
                    setIsCropperReady(true);
                  }}
                />
              </Box>
              
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom>Масштаб</Typography>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(_, value) => {
                    setZoom(value as number);
                    if (isCropperReady && cropperRef.current?.cropper) {
                      cropperRef.current.cropper.zoomTo(value as number);
                    }
                  }}
                />
                
                <Typography gutterBottom>Поворот</Typography>
                <Slider
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(_, value) => {
                    setRotation(value as number);
                    if (isCropperReady && cropperRef.current?.cropper) {
                      cropperRef.current.cropper.rotateTo(value as number);
                    }
                  }}
                />
              </Box>
            </>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Выберите изображение для аватара
            </Typography>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          <Button
            variant="outlined"
            onClick={handleSelectAgain}
            startIcon={<PhotoCamera />}
          >
            Выбрать изображение
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          disabled={!selectedFile || loading || !isCropperReady}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvatarEditor;