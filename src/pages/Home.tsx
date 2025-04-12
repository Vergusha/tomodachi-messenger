import { useState, useEffect } from 'react';
import { Box, useMediaQuery, useTheme, Drawer, Fab, SwipeableDrawer, Slide } from '@mui/material';
import { Menu as MenuIcon, Chat as ChatIcon } from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { UserSearchResult } from '../types';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../App';

const Home = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  const { mode } = useThemeContext();
  const isDarkMode = mode === 'dark';

  const drawerWidth = isSmallMobile ? '85%' : 320;

  // Listen for chat updates to keep sidebar in sync
  useEffect(() => {
    const loadChatData = async () => {
      if (!selectedChatId || !currentUser) return;
      
      try {
        // This would typically refresh chat data if needed
        // For now, we'll just ensure the recipientId is set if not already
        if (!recipientId) {
          const chatsQuery = query(
            collection(db, 'chats'),
            where('__name__', '==', selectedChatId)
          );
          
          const chatSnapshot = await getDocs(chatsQuery);
          if (!chatSnapshot.empty) {
            const chatData = chatSnapshot.docs[0].data();
            const chatRecipientId = chatData.participants.find(
              (id: string) => id !== currentUser.uid
            );
            setRecipientId(chatRecipientId || null);
          }
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
      }
    };
    
    loadChatData();
  }, [selectedChatId, currentUser, recipientId]);

  // Handle selecting a chat from the sidebar
  const handleChatSelect = (chatId: string, recipientId: string) => {
    setSelectedChatId(chatId);
    setRecipientId(recipientId);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Handle selecting a user from search results
  const handleUserSelect = async (user: UserSearchResult) => {
    if (!currentUser) return;
    
    try {
      // Check if a chat already exists between current user and selected user
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      let existingChatId: string | null = null;
      
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(user.uid)) {
          existingChatId = doc.id;
        }
      });
      
      if (existingChatId) {
        // Chat already exists, select it
        setSelectedChatId(existingChatId);
      } else {
        // For a new user, just set recipientId and let ChatWindow create the chat when sending a message
        setSelectedChatId(null);
      }
      
      setRecipientId(user.uid);
      
      if (isMobile) {
        setMobileOpen(false);
      }
    } catch (error) {
      console.error('Error handling user selection:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden',
      bgcolor: 'background.default'
    }}>
      <Header openMobileMenu={isMobile ? handleDrawerToggle : undefined} />
      
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Sidebar for desktop */}
        {!isMobile && (
          <Box 
            sx={{ 
              width: drawerWidth, 
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              boxShadow: isDarkMode ? '2px 0 10px rgba(0,0,0,0.2)' : '1px 0 5px rgba(0,0,0,0.05)'
            }}
          >
            <Sidebar 
              onChatSelect={handleChatSelect} 
              onUserSelect={handleUserSelect}
              selectedChatId={selectedChatId}
            />
          </Box>
        )}

        {/* Sidebar drawer for mobile */}
        {isMobile && (
          <SwipeableDrawer
            variant="temporary"
            open={mobileOpen}
            onOpen={() => setMobileOpen(true)}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                width: drawerWidth,
                boxSizing: 'border-box',
                boxShadow: isDarkMode 
                  ? '4px 0 15px rgba(0,0,0,0.3)'
                  : '2px 0 10px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Sidebar 
              onChatSelect={handleChatSelect} 
              onUserSelect={handleUserSelect}
              selectedChatId={selectedChatId}
              isMobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
            />
          </SwipeableDrawer>
        )}

        {/* Chat content area */}
        <Box sx={{ 
          flexGrow: 1, 
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <ChatWindow chatId={selectedChatId} recipientId={recipientId} />
          
          {/* Mobile toggle button */}
          {isMobile && !mobileOpen && (
            <Slide direction="up" in={!mobileOpen} mountOnEnter unmountOnExit>
              <Fab 
                color="primary"
                aria-label="open contacts"
                onClick={handleDrawerToggle}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  boxShadow: isDarkMode ? '0 3px 8px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px) scale(1.05)',
                    boxShadow: isDarkMode ? '0 4px 10px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.3)'
                  }
                }}
              >
                <MenuIcon />
              </Fab>
            </Slide>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Home;