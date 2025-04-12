import { useState } from 'react';
import { Box, List, Typography, IconButton, Tooltip } from '@mui/material';
import { PersonSearch } from '@mui/icons-material';
import { UserSearch } from './UserSearch';
// ... остальные импорты ...

export const ChatList = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // ... остальной код ...

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6">Чаты</Typography>
        <Tooltip title="Найти пользователя">
          <IconButton onClick={() => setIsSearchOpen(true)}>
            <PersonSearch />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ... остальной код списка чатов ... */}

      <UserSearch 
        open={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </Box>
  );
}; 