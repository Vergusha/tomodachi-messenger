import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

export const searchUsersByUsername = async (searchQuery: string) => {
  try {
    // Создаем запрос к коллекции users
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('displayName', '>=', searchQuery),
      where('displayName', '<=', searchQuery + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export const createOrGetChat = async (currentUserId: string, otherUserId: string) => {
  try {
    // Проверяем, существует ли уже чат между пользователями
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );

    const querySnapshot = await getDocs(q);
    const existingChat = querySnapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(otherUserId);
    });

    if (existingChat) {
      return existingChat.id;
    }

    // Если чат не существует, создаем новый
    const newChatRef = doc(collection(db, 'chats'));
    await updateDoc(newChatRef, {
      participants: [currentUserId, otherUserId],
      lastMessage: null,
      lastMessageTime: null,
      createdAt: new Date().toISOString()
    });

    return newChatRef.id;
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error;
  }
}; 