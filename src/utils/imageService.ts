import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { supabase, AVATARS_BUCKET } from '../supabaseConfig';

// Максимальный размер файла, 1MB
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Валидация файла изображения
 */
export const validateImageFile = (file: File): string | null => {
  // Проверка типа файла
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Пожалуйста, выберите изображение в формате JPEG, PNG, GIF или WEBP';
  }

  // Проверка размера файла (максимум 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return 'Размер изображения не должен превышать 2MB';
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

/**
 * Загрузка изображения профиля на Supabase Storage
 */
export const uploadProfileImage = async (userId: string, imageBlob: Blob): Promise<string> => {
  try {
    // Преобразуем Blob в File для загрузки
    const file = new File([imageBlob], `avatar-${userId}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    // Путь, по которому будет сохранено изображение - использование userId как директории
    // для обеспечения разделения по пользователям и проверки доступа через RLS
    const filePath = `${userId}/${file.name}`;
    
    // Загружаем файл в Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(AVATARS_BUCKET)
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: true, // Заменять существующий файл
        contentType: 'image/jpeg'
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Ошибка загрузки: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Не удалось загрузить изображение');
    }
    
    // Получаем публичный URL загруженного изображения
    const { data: publicUrlData } = supabase
      .storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(data.path);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Не удалось получить URL изображения');
    }
    
    // Обновляем URL изображения в Firebase
    await updateDoc(doc(db, 'users', userId), {
      photoURL: publicUrlData.publicUrl
    });
    
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
}