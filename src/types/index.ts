export interface UserProfile {
  uid: string;
  username: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  createdAt: any; // Can be Firestore timestamp or string
  updatedAt?: any; // Can be Firestore timestamp or string
  originalUsername?: string;
  isOnline?: boolean;
  lastSeen?: any; // Timestamp of when the user was last online
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any; // Can be Firestore timestamp or string
  read: boolean;
  attachments?: string[]; // URLs to any attached files or images
}

export interface Chat {
  id: string;
  participants: string[];
  createdAt: any; // Can be Firestore timestamp or string
  updatedAt: any; // Can be Firestore timestamp or string
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
    read: boolean;
  };
}

export interface UserSearchResult {
  uid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
  isOnline?: boolean;
}

// Theme mode type
export type ThemeMode = 'light' | 'dark';

// Message time display options
export type TimeDisplayFormat = 'relative' | 'absolute';