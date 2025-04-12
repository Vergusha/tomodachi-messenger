import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Avatar,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import UserProfile from '../profile/UserProfile';

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
  const [recipientProfile, setRecipientProfile] = useState<any | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  // Theme and responsive design setup
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

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
          setRecipientProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching recipient profile:', error);
      }
    };
    
    fetchRecipientProfile();
  }, [recipientId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
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
      
      // Add message to the chat
      await addDoc(collection(db, `chats/${activeChatId}/messages`), {
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
    } catch (error) {
      console.error('Error sending message:', error);
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
      
      if (isToday(date)) {
        return format(date, 'HH:mm');
      } else {
        return format(date, 'dd.MM.yyyy HH:mm');
      }
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
      return 'Сегодня';
    } else if (isYesterday(date)) {
      return 'Вчера';
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
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Выберите чат или найдите пользователя для общения
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
            {recipientProfile?.displayName || recipientProfile?.username || 'Пользователь'}
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
            {recipientProfile?.isOnline ? 'В сети' : 'Не в сети'}
          </Typography>
        </Box>
      </Paper>

      {/* Chat messages with improved styling */}
      <Box
        sx={{
          flexGrow: 1,
          p: isMobile ? 1.5 : 2,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(248,248,252,0.8)'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={isMobile ? 32 : 40} color="primary" />
          </Box>
        ) : messages.length > 0 ? (
          messages.map((message, index) => (
            <Box key={message.id}>
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
                
                <Tooltip title={getTooltipTime(message.timestamp)} placement="top" arrow>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      px: 2,
                      maxWidth: isMobile ? '85%' : '70%', 
                      borderRadius: 2.5,
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
          ))
        ) : (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Нет сообщений. Начните общение прямо сейчас!
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
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
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#FFFFFF',
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
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
          placeholder="Написать сообщение..."
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
          aria-label="отправить сообщение"
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