import { Box } from '@mui/material';
import Header from '../components/layout/Header';
import Profile from '../components/profile/Profile';

const ProfilePage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Profile />
      </Box>
    </Box>
  );
};

export default ProfilePage;