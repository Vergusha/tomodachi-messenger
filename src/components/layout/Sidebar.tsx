import { useState, useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Avatar, 
  ListItemText, 
  Typography, 
  TextField, 
  InputAdornment,
  Divider,
  Badge,
  CircularProgress,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Close as CloseIcon, 
  Chat as ChatIcon,
  PersonSearch as PersonSearchIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config.ts';
import { UserSearchResult, Chat, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SidebarProps {
  onChatSelect: (chatId: string, recipientId: string) => void;
  onUserSelect: (user: UserSearchResult) => void;
  selectedChatId?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar = ({ 
  onChatSelect, 
  onUserSelect, 
  selectedChatId,
  isMobileOpen, 
  onMobileClose 
}: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsInfo, setRecipientsInfo] = useState<Record<string, UserProfile>>({});
  
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Load user's chats
  useEffect(() => {
    const loadChats = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Modified query: only filter by participants without ordering
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(chatsQuery);
        let chatsList: Chat[] = [];
        const recipientIds = new Set<string>();
        
        querySnapshot.forEach((doc) => {
          const chatData = doc.data() as Chat;
          // Use spread first, then override id to ensure we use Firestore's document ID
          chatsList.push({ ...chatData, id: doc.id });
          
          // Get recipient ID
          const recipientId = chatData.participants.find(id => id !== currentUser.uid);
          if (recipientId) recipientIds.add(recipientId);
        });
        
        // Sort in memory instead of in the query
        chatsList = chatsList.sort((a, b) => {
          const timeA = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
          const timeB = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
          return timeB.getTime() - timeA.getTime();
        });
        
        setChats(chatsList);
        
        // Fetch recipient user info
        const recipientProfiles: Record<string, UserProfile> = {};
        for (const id of recipientIds) {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            recipientProfiles[id] = userDoc.data() as UserProfile;
          }
        }
        
        setRecipientsInfo(recipientProfiles);
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChats();
  }, [currentUser]);

  // Handle search for users by username
  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) return;
    
    try {
      setIsSearching(true);
      setSearchResults([]);
      
      // Преобразуем поисковый запрос в нижний регистр для соответствия формату хранения
      const searchLower = searchQuery.toLowerCase();
      
      // Используем более простой запрос без orderBy для устранения проблем с индексацией
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '>=', searchLower),
        limit(10)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const results: UserSearchResult[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Фильтруем результаты по частичному совпадению имени пользователя
        if (doc.id !== currentUser.uid && 
            userData.username.includes(searchLower)) {
          results.push({
            uid: doc.id,
            username: userData.originalUsername || userData.username,
            displayName: userData.displayName || userData.username,
            photoURL: userData.photoURL,
            isOnline: userData.isOnline || false
          });
        }
      });
      
      // Если нет результатов, пробуем поискать по displayName
      if (results.length === 0) {
        const displayNameQuery = query(
          collection(db, 'users'),
          limit(20)
        );
        
        const displayNameSnapshot = await getDocs(displayNameQuery);
        displayNameSnapshot.forEach((doc) => {
          const userData = doc.data();
          // Проверяем имя пользователя или отображаемое имя
          if (doc.id !== currentUser.uid && 
              ((userData.displayName && 
                userData.displayName.toLowerCase().includes(searchLower)) || 
               userData.username.includes(searchLower))) {
            
            const alreadyAdded = results.some(r => r.uid === doc.id);
            if (!alreadyAdded) {
              results.push({
                uid: doc.id,
                username: userData.originalUsername || userData.username,
                displayName: userData.displayName || userData.username,
                photoURL: userData.photoURL,
                isOnline: userData.isOnline || false
              });
            }
          }
        });
      }
      
      // Сортируем результаты по релевантности
      results.sort((a, b) => {
        // Sort online users first
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        const aMatch = (a.username.toLowerCase().indexOf(searchLower) >= 0) ? 
                      a.username.toLowerCase().indexOf(searchLower) : Infinity;
        const bMatch = (b.username.toLowerCase().indexOf(searchLower) >= 0) ? 
                      b.username.toLowerCase().indexOf(searchLower) : Infinity;
        return aMatch - bMatch;
      });
      
      setSearchResults(results);
      
      if (results.length === 0) {
        console.log('Поиск не дал результатов для:', searchQuery);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Format the last message timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (e) {
      return '';
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Get chat recipient details from participants array
  const getChatRecipient = (participants: string[]) => {
    if (!currentUser) return '';
    return participants.find(id => id !== currentUser.uid) || '';
  };
  
  // Handle chat selection on mobile
  const handleChatSelect = (chatId: string, recipientId: string) => {
    onChatSelect(chatId, recipientId);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <Box sx={{ 
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: 'background.paper',
      borderRight: 1,
      borderColor: 'divider',
      overflow: 'hidden',
      display: isMobile && !isMobileOpen ? 'none' : 'flex'
    }}>
      {/* Search bar with improved styling */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: isMobile ? 1.5 : 2, 
          backgroundColor: isDarkMode ? 'background.paper' : 'primary.light',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <TextField
          placeholder="Поиск пользователей..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon 
                  color="action" 
                  fontSize={isMobile ? "small" : "medium"}
                  onClick={handleSearch}
                  sx={{ cursor: 'pointer' }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {isSearching ? (
                  <CircularProgress size={isMobile ? 16 : 20} color="inherit" />
                ) : searchQuery ? (
                  <IconButton
                    size="small"
                    onClick={clearSearch}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </InputAdornment>
            ),
            sx: { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'background.paper', 
              borderRadius: 3,
              '&:hover': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
              },
              transition: 'background-color 0.2s ease'
            }
          }}
        />
      </Paper>

      {/* Search Results with improved styling */}
      {searchResults.length > 0 && (
        <>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center', 
            px: 2, 
            py: 1.5,
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
          }}>
            <PersonSearchIcon sx={{ fontSize: 18, mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              Результаты поиска
            </Typography>
          </Box>
          <List disablePadding sx={{ maxHeight: '40%', overflow: 'auto' }}>
            {searchResults.map((user) => (
              <ListItem 
                key={user.uid}
                component="button"
                onClick={() => {
                  onUserSelect(user);
                  if (isMobile && onMobileClose) onMobileClose();
                }}
                sx={{ 
                  px: 2,
                  py: 1,
                  transition: 'all 0.15s ease',
                  '&:hover': { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'secondary.light',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      user.isOnline ? (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
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
                      src={user.photoURL} 
                      alt={user.username}
                      sx={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        border: `2px solid ${isDarkMode ? theme.palette.background.paper : theme.palette.primary.light}`,
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText 
                  primary={user.displayName || user.username}
                  secondary={`@${user.username}`}
                  primaryTypographyProps={{
                    fontWeight: 'medium',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                  secondaryTypographyProps={{
                    fontSize: isMobile ? '0.75rem' : '0.8rem'
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: user.isOnline ? 'success.main' : 'text.secondary',
                    fontWeight: user.isOnline ? 'medium' : 'normal',
                    fontSize: '0.7rem'
                  }}
                >
                  {user.isOnline ? 'в сети' : ''}
                </Typography>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 0.5 }} />
        </>
      )}

      {/* Chats list with improved styling */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center', 
        px: 2, 
        py: 1.5,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
      }}>
        <ChatIcon sx={{ fontSize: 18, mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Сообщения
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, flexGrow: 1 }}>
          <CircularProgress size={isMobile ? 24 : 30} color="primary" />
        </Box>
      ) : (
        <List sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          py: 0,
          '&::-webkit-scrollbar': {
            width: '0.4em'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.2)',
            borderRadius: 2,
          }
        }}>
          {chats.length > 0 ? (
            chats.map((chat) => {
              const recipientId = getChatRecipient(chat.participants);
              const recipient = recipientsInfo[recipientId];
              const isSelected = selectedChatId === chat.id;
              
              return (
                <ListItem 
                  key={chat.id}
                  component="button"
                  disableGutters
                  onClick={() => handleChatSelect(chat.id, recipientId)}
                  sx={{ 
                    px: 2,
                    py: 1.5,
                    transition: 'all 0.15s ease-in-out',
                    backgroundColor: isSelected 
                      ? isDarkMode ? 'primary.dark' : 'primary.light' 
                      : 'transparent',
                    borderLeft: isSelected ? 4 : 0,
                    borderColor: 'primary.main',
                    '&:hover': { 
                      backgroundColor: isSelected 
                        ? isDarkMode ? 'primary.dark' : 'primary.light'
                        : isDarkMode ? 'rgba(255,255,255,0.05)' : 'secondary.light',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <Box sx={{ display: 'flex' }}>
                          {recipient?.isOnline && (
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                border: 2,
                                borderColor: 'background.paper'
                              }}
                            />
                          )}
                        </Box>
                      }
                    >
                      <Badge
                        color="primary"
                        variant="dot"
                        invisible={!chat.lastMessage || chat.lastMessage.senderId === currentUser?.uid || chat.lastMessage.read}
                        overlap="circular"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      >
                        <Avatar 
                          src={recipient?.photoURL} 
                          alt={recipient?.username || 'User'}
                          sx={{
                            width: isMobile ? 36 : 40,
                            height: isMobile ? 36 : 40,
                            border: `2px solid ${
                              isSelected 
                                ? isDarkMode ? theme.palette.primary.main : theme.palette.background.paper 
                                : isDarkMode ? theme.palette.background.default : 'transparent'
                            }`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          {recipient?.username?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                      </Badge>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={recipient?.displayName || recipient?.username || 'Пользователь'}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{
                            width: '70%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: chat.lastMessage && 
                                      chat.lastMessage.senderId !== currentUser?.uid && 
                                      !chat.lastMessage.read ? 'medium' : 'regular',
                            color: chat.lastMessage && 
                                  chat.lastMessage.senderId !== currentUser?.uid && 
                                  !chat.lastMessage.read 
                              ? 'text.primary' 
                              : 'text.secondary',
                            fontSize: isMobile ? '0.75rem' : '0.8rem'
                          }}
                        >
                          {chat.lastMessage 
                            ? chat.lastMessage.text
                            : 'Начните диалог'}
                        </Typography>
                        
                        {chat.lastMessage && (
                          <Tooltip title={chat.lastMessage.timestamp} arrow placement="left">
                            <Typography 
                              component="span" 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                alignSelf: 'flex-end',
                                fontSize: '0.7rem',
                                ml: 1
                              }}
                            >
                              {formatMessageTime(chat.lastMessage.timestamp)}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{
                      fontWeight: chat.lastMessage && 
                              chat.lastMessage.senderId !== currentUser?.uid &&
                              !chat.lastMessage.read ? 'bold' : 'medium',
                      color: isSelected ? (isDarkMode ? 'common.white' : 'primary.dark') : 'text.primary',
                      noWrap: true,
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}
                  />
                </ListItem>
              );
            })
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ChatIcon sx={{ fontSize: 60, color: 'text.disabled', mx: 'auto', mb: 2, opacity: 0.5 }} />
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                У вас пока нет сообщений
              </Typography>
              <Typography color="text.secondary" variant="caption">
                Найдите пользователей, чтобы начать общение!
              </Typography>
            </Box>
          )}
        </List>
      )}
    </Box>
  );
};

export default Sidebar;