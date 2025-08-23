import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Avatar, Button, Divider } from '@mui/material';
import { FaSignOutAlt } from 'react-icons/fa';
import { logout as logoutAction } from '../../store/authSlice';
import { logout as logoutService } from '../../services/authService';

const UserProfile = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    // 清除本地存儲
    logoutService();
    // 更新 Redux 狀態
    dispatch(logoutAction());
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={user.picture}
          alt={user.name}
          sx={{ width: 50, height: 50, mr: 2 }}
        />
        <Box>
          <Typography variant="h6">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Button
        variant="outlined"
        color="error"
        startIcon={<FaSignOutAlt />}
        onClick={handleLogout}
        fullWidth
      >
        登出
      </Button>
    </Box>
  );
};

export default UserProfile;