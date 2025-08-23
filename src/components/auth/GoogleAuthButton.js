import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { FaGoogle } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { initiateGoogleAuth } from '../../services/authService';
import { loginStart } from '../../store/authSlice';

const GoogleAuthButton = ({ variant = 'contained', fullWidth = false }) => {
  const dispatch = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  const handleGoogleLogin = () => {
    dispatch(loginStart());
    initiateGoogleAuth();
  };

  if (isAuthenticated) {
    return null; // 如果已登入，不顯示按鈕
  }

  return (
    <Button
      variant={variant}
      color="primary"
      fullWidth={fullWidth}
      startIcon={<FaGoogle />}
      onClick={handleGoogleLogin}
      disabled={loading}
      sx={{
        py: 1,
        backgroundColor: '#4285F4',
        color: '#fff',
        '&:hover': {
          backgroundColor: '#357ae8',
        },
      }}
    >
      {loading ? '登入中...' : '使用 Google 帳號登入'}
    </Button>
  );
};

export default GoogleAuthButton;