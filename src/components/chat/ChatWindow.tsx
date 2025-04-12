import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Fade
} from '@mui/material';
import { 
  Send as SendIcon,
  Image as ImageIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import {
  collection,
  query,
  orderBy,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig.ts';
import { useAuth } from '../../contexts/AuthContext';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import UserProfile from '../profile/UserProfile';
import { UserProfile as UserProfileType } from '../../types';

interface ChatWindowProps {
  chatId: string | null;
  recipientId: string | null;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
}

const ChatWindow = ({ chatId, recipientId }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<UserProfileType | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Theme and responsive design setup
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat messages and subscribe to updates
  useEffect(() => {
    setMessages([]);
    setRecipientProfile(null);
    
    if (!chatId) return;

    setLoading(true);
    
    // Subscribe to messages
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp,
          read: data.read || false
        });
        
        // Mark received messages as read
        if (currentUser && data.senderId !== currentUser.uid && !data.read) {
          updateDoc(doc.ref, { read: true });
        }
      });
      
      setMessages(loadedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  // Fetch recipient profile
  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (!recipientId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', recipientId));
        
        if (userDoc.exists()) {
          setRecipientProfile(userDoc.data() as UserProfileType);
        }
      } catch (error) {
        console.error('Error fetching recipient profile:', error);
      }
    };
    
    fetchRecipientProfile();
  }, [recipientId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || isSending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    
    const optimisticMessage: Message = {
      id: 'temp-' + Date.now(),
      senderId: currentUser.uid,
      text: messageText,
      timestamp: new Date(),
      read: false
    };
    
    try {
      // If no chatId, create a new chat first
      let activeChatId = chatId;
      
      if (!activeChatId && recipientId) {
        // Create new chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          participants: [currentUser.uid, recipientId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        activeChatId = newChatRef.id;
      }
      
      if (!activeChatId) return;
      
      // Add optimistic message to the state
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Add message to the chat
      const messageRef = await addDoc(collection(db, `chats/${activeChatId}/messages`), {
        senderId: currentUser.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update chat with last message data
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: {
          text: messageText,
          senderId: currentUser.uid,
          timestamp: new Date().toISOString(),
          read: false
        },
        updatedAt: serverTimestamp()
      });
      
      // Remove optimistic message and add real one
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message text
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Format the message timestamp
  const formatMessageTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      if (isToday(date)) return format(date, 'HH:mm');
      if (isYesterday(date)) return `yesterday at ${format(date, 'HH:mm')}`;
      return format(date, 'dd.MM.yyyy HH:mm');
    } catch (e) {
      return '';
    }
  };
  
  // Get tooltip text with full date and time
  const getTooltipTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'PPPp', { locale: ru });
    } catch (e) {
      return '';
    }
  };
  
  // Check if we need to show a date separator
  const shouldShowDateSeparator = (message: Message, index: number): boolean => {
    if (index === 0) return true;
    
    const currentDate = message.timestamp?.toDate?.() || new Date(message.timestamp);
    const previousDate = messages[index - 1].timestamp?.toDate?.() || new Date(messages[index - 1].timestamp);
    
    return !isSameDay(currentDate, previousDate);
  };
  
  // Format date for separator
  const formatDateSeparator = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'd MMMM yyyy', { locale: ru });
    }
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };
  
  if (!chatId && !recipientId) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Select a chat or find a user to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Chat header with online indicator */}
      <Paper
        elevation={1}
        sx={{
          p: isMobile ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
          width: '100%',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {isMobile && (
          <IconButton sx={{ mr: 1 }} edge="start">
            <ArrowBackIcon />
          </IconButton>
        )}
        
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            recipientProfile?.isOnline ? (
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  border: 2,
                  borderColor: 'background.paper'
                }}
              />
            ) : null
          }
        >
          <Avatar
            src={recipientProfile?.photoURL || ''}
            alt={recipientProfile?.displayName || 'User'}
            onClick={handleShowProfile}
            sx={{ 
              width: isMobile ? 38 : 42,
              height: isMobile ? 38 : 42,
              mr: 2,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                opacity: 0.9,
              }
            }}
          >
            {recipientProfile?.displayName?.[0] || recipientProfile?.username?.[0] || '?'}
          </Avatar>
        </Badge>
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant={isMobile ? "body1" : "subtitle1"} sx={{ fontWeight: 'medium' }}>
            {recipientProfile?.displayName || recipientProfile?.username || 'User'}
          </Typography>
          <Typography 
            variant="body2" 
            color={recipientProfile?.isOnline ? "success.main" : "text.secondary"}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          >
            {recipientProfile?.isOnline ? 'Online' : 'Offline'}
          </Typography>
        </Box>
      </Paper>

      {/* Chat messages with improved styling and width control */}
      <Box
        sx={{
          flexGrow: 1,
          p: isMobile ? 1.5 : 2,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          width: '100%',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(248,248,252,0.8)'
        }}
      >
        <Box
          sx={{ 
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 0, sm: 2, md: 4, lg: 6, xl: 8 }
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={isMobile ? 32 : 40} color="primary" />
            </Box>
          ) : messages.length > 0 ? (
            messages.map((message, index) => (
              <Fade in={true} key={message.id}>
                <Box>
                  {/* Date separator */}
                  {shouldShowDateSeparator(message, index) && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        my: 2
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: 4,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {formatDateSeparator(message.timestamp)}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  
                  {/* Message bubble */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.senderId === currentUser?.uid ? 'flex-end' : 'flex-start',
                      mb: 1,
                      px: isMobile ? 0.5 : 1
                    }}
                  >
                    {message.senderId !== currentUser?.uid && (
                      <Avatar
                        src={recipientProfile?.photoURL || ''}
                        alt={recipientProfile?.displayName || 'User'}
                        sx={{ 
                          mr: 1, 
                          width: isMobile ? 28 : 32, 
                          height: isMobile ? 28 : 32,
                          opacity: 0.9
                        }}
                        onClick={handleShowProfile}
                      >
                        {recipientProfile?.displayName?.[0] || '?'}
                      </Avatar>
                    )}
                    
                    <Tooltip title={getTooltipTime(message.timestamp)} arrow placement="top">
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          px: 2,
                          maxWidth: isMobile ? '85%' : isLargeScreen ? '50%' : '70%', 
                          borderRadius: message.senderId === currentUser?.uid ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          bgcolor: message.senderId === currentUser?.uid 
                            ? theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.main'
                            : theme.palette.mode === 'dark' ? 'background.paper' : '#F0F0F0',
                          color: message.senderId === currentUser?.uid 
                            ? 'primary.contrastText' 
                            : theme.palette.mode === 'dark' ? 'text.primary' : 'text.primary',
                          position: 'relative',
                          boxShadow: theme.palette.mode === 'dark' ? 2 : 1,
                          transition: 'transform 0.1s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 2
                          }
                        }}
                      >
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            wordBreak: 'break-word',
                            fontSize: isMobile ? '0.9rem' : '1rem'
                          }}
                        >
                          {message.text}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: 'right',
                            mt: 0.5,
                            opacity: 0.7,
                            fontSize: '0.7rem'
                          }}
                        >
                          {formatMessageTime(message.timestamp)}
                        </Typography>
                      </Paper>
                    </Tooltip>
                  </Box>
                </Box>
              </Fade>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No messages yet. Start the conversation now!
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Message input with improved styling */}
      <Paper
        elevation={3}
        component="form"
        sx={{
          p: isMobile ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          position: 'relative',
          width: '100%',
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#FFFFFF',
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Box
          sx={{ 
            width: '100%',
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 0, sm: 2, md: 4, lg: 6, xl: 8 }
          }}
        >
          {!isMobile && (
            <IconButton 
              color="primary" 
              aria-label="add emoji"
              sx={{ 
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            >
              <EmojiIcon />
            </IconButton>
          )}
          
          {!isMobile && (
            <IconButton 
              color="primary" 
              aria-label="attach file"
              sx={{ 
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            >
              <AttachIcon />
            </IconButton>
          )}
          
          <IconButton 
            color="primary" 
            aria-label="upload image"
            sx={{ 
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'scale(1.1)' }
            }}
          >
            <ImageIcon />
          </IconButton>
          
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            variant="outlined"
            size="small"
            multiline={!isMobile}
            maxRows={3}
            sx={{
              ml: 0.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                },
              }
            }}
          />
          
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            aria-label="send message"
            size={isMobile ? "medium" : "large"}
            sx={{
              ml: 0.5,
              backgroundColor: (newMessage.trim()) 
                ? theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.main'
                : 'action.disabledBackground',
              color: (newMessage.trim()) ? 'primary.contrastText' : 'text.disabled',
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: (newMessage.trim()) 
                  ? theme.palette.mode === 'dark' ? 'primary.main' : 'primary.dark'
                  : 'action.disabledBackground',
                transform: newMessage.trim() ? 'scale(1.05)' : 'none',
              }
            }}
          >
            <SendIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Box>
      </Paper>
      
      {/* User Profile Dialog */}
      <UserProfile 
        open={showProfile} 
        onClose={() => setShowProfile(false)} 
        userId={recipientId} 
        isChatActive={true}
      />
    </Box>
  );
};

export default ChatWindow;