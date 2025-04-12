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
import { supabase, AVATARS_BUCKET } from '../../supabaseConfig';
import { updateUserProfile } from '../../lib/userService';
import { Cropper } from 'react-cropper';
import { PhotoCamera } from '@mui/icons-material';

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
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  
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
      setCroppedImage(null);
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
    if (!currentUser || !selectedFile) return;
    
    try {
      // Image processing (cropping and compression)
      const processedImage = await processImageForUpload(selectedFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85,
        aspectRatio: 1
      });
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from(AVATARS_BUCKET)
        .upload(`${currentUser.uid}/avatar.jpg`, processedImage, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(`${currentUser.uid}/avatar.jpg`);
      
      if (publicUrlData?.publicUrl) {
        await updateUserProfile(currentUser.displayName || '', publicUrlData.publicUrl);
        onComplete(publicUrlData.publicUrl);
        onClose();
      }
    } catch (err) {
      console.error('Error saving avatar:', err);
      setError('Failed to save avatar. Please try again.');
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Profile Avatar</DialogTitle>
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
                  image={selectedFile}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                />
              </Box>
              
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom>Scale</Typography>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e, value) => setZoom(value as number)}
                />
                
                <Typography gutterBottom>Rotation</Typography>
                <Slider
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(e, value) => setRotation(value as number)}
                />
              </Box>
            </>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Select an image for your avatar.
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
            onClick={() => fileInputRef.current?.click()}
            startIcon={<PhotoCamera />}
          >
            Select Image
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          disabled={!selectedFile || loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvatarEditor;