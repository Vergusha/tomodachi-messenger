import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    const userDoc = doc(db, 'users', displayName);
    await updateDoc(userDoc, {
      ...(photoURL && { photoURL }),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}; 