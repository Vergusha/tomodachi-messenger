import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register new user
  async function register(email: string, password: string, username: string): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Standardize username to lowercase for consistent search
    const standardizedUsername = username.toLowerCase();
    
    // Update profile with username
    await updateProfile(userCredential.user, {
      displayName: username // Keep display name as original for UI
    });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      username: standardizedUsername, // Store lowercase for search
      displayName: username, // Store original for display
      originalUsername: username, // Store original username just in case
      photoURL: userCredential.user.photoURL || '',
      createdAt: new Date().toISOString()
    });
  }

  // Login
  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  // Reauthenticate the user for sensitive operations
  async function reauthenticate(password: string): Promise<boolean> {
    if (!currentUser || !currentUser.email) return false;
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);
      return true;
    } catch (error) {
      console.error('Reauthentication error:', error);
      return false;
    }
  }

  // Delete user account and all associated data
  async function deleteAccount(password: string): Promise<void> {
    if (!currentUser) throw new Error("User is not authorized");
    
    // Reauthenticate user before deleting account
    const isAuthenticated = await reauthenticate(password);
    if (!isAuthenticated) {
      throw new Error("Invalid password");
    }
    
    try {
      // Delete user's chats from Firestore
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      
      // Delete all chats and messages
      const deletionPromises = querySnapshot.docs.map(async (chatDoc) => {
        // Get all messages in the chat
        const messagesSnapshot = await getDocs(collection(db, `chats/${chatDoc.id}/messages`));
        
        // Delete all messages in the chat
        const messagePromises = messagesSnapshot.docs.map(async (messageDoc) => {
          await deleteDoc(doc(db, `chats/${chatDoc.id}/messages`, messageDoc.id));
        });
        
        await Promise.all(messagePromises);
        
        // Delete the chat document
        await deleteDoc(doc(db, 'chats', chatDoc.id));
      });
      
      await Promise.all(deletionPromises);
      
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid));
      
      // Finally delete the user account itself
      await deleteUser(currentUser);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error("Failed to delete account. Please try again later.");
    }
  }

  // Update user profile
  async function updateUserProfile(displayName: string, photoURL?: string) {
    if (!currentUser) return;
    
    await updateProfile(currentUser, {
      displayName,
      ...(photoURL && { photoURL })
    });
    
    // Update user document in Firestore
    await setDoc(doc(db, 'users', currentUser.uid), {
      displayName,
      ...(photoURL && { photoURL }),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- ONLINE STATUS MANAGEMENT ---
  useEffect(() => {
    let isOnlineInterval: NodeJS.Timeout | null = null;
    let visibilityHandler: (() => void) | null = null;
    let beforeUnloadHandler: (() => void) | null = null;

    async function setOnlineStatus(online: boolean) {
      if (!auth.currentUser) return;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isOnline: online,
        ...(online ? {} : { lastSeen: new Date().toISOString() })
      });
    }

    // Устанавливаем онлайн при входе и при фокусе вкладки
    if (currentUser) {
      setOnlineStatus(true);
      // Периодически обновляем онлайн (например, каждые 60 секунд)
      isOnlineInterval = setInterval(() => setOnlineStatus(true), 60000);
      // При возврате на вкладку
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') setOnlineStatus(true);
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      // При закрытии вкладки/уходе
      beforeUnloadHandler = () => setOnlineStatus(false);
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }
    return () => {
      if (isOnlineInterval) clearInterval(isOnlineInterval);
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
      // При размонтировании/выходе выставляем offline
      setOnlineStatus(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
    deleteAccount,
    reauthenticate
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}