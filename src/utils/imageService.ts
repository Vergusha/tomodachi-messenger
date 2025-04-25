import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Image file validation
 */

// Check file type
export const validateImageFile = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Please select an image in JPEG, PNG, GIF or WEBP format';
  }

  // Check file size (maximum 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > maxSize) {
    return 'Image size should not exceed 2MB';
  }

  return null;
};

/**
 * Обработка изображения перед загрузкой
 * - Сжатие
 * - Изменение размеров
 * - Вращение
 */
export const processImageForUpload = async (
  file: File, 
  options: { 
    maxWidth: number; 
    maxHeight: number; 
    quality: number;
    aspectRatio?: number;
  }
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const { maxWidth, maxHeight, quality } = options;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Определяем новые размеры с сохранением пропорций
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Создаем канвас для рисования изображения
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось создать контекст канваса'));
          return;
        }
        
        // Рисуем изображение
        ctx.drawImage(img, 0, 0, width, height);
        
        // Преобразуем в Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Не удалось создать Blob из изображения'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Не удалось загрузить изображение'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл'));
    };
    
    reader.readAsDataURL(file);
  });
};