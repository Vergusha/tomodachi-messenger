import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Исправлено: теперь updateUserProfile принимает userId, displayName, photoURL, bio
export const updateUserProfile = async (userId: string, displayName: string, photoURL?: string, bio?: string) => {
  try {
    const userDoc = doc(db, 'users', userId);
    const updateData: any = {
      displayName,
      updatedAt: new Date().toISOString(),
    };
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (bio !== undefined) updateData.bio = bio;
    await updateDoc(userDoc, updateData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Исправлено: поиск по username (а не displayName)
export const searchUsersByUsername = async (searchQuery: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('username', '>=', searchQuery.toLowerCase()),
      where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
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

// Исправлено: используем setDoc для создания нового чата
export const createOrGetChat = async (currentUserId: string, otherUserId: string) => {
  try {
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
    // Новый чат
    const newChatRef = doc(collection(db, 'chats'));
    await setDoc(newChatRef, {
      participants: [currentUserId, otherUserId],
      lastMessage: null,
      lastMessageTime: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return newChatRef.id;
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error;
  }
};

export const deleteChat = async (chatId: string) => {
  try {
    // Удаляем все сообщения чата
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    // Удаляем каждое сообщение
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Удаляем сам чат
    await deleteDoc(doc(db, 'chats', chatId));
    
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};