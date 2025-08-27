import React from 'react';
import { Button, Box, Typography } from '@mui/material';
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
      startIcon={
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            backgroundSize: '200% 200%',
            color: '#fff',
            animation: 'flow 3s ease-in-out infinite',
            '@keyframes flow': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' },
            },
            '& svg': {
              fill: 'white',
              width: 18,
              height: 18,
            },
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M8 6c2 0 4 2 6 4-2 2-4 4-6 4" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M16 18c-2 0-4-2-6-4 2-2 4-4 6-4" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </Box>
      }
      onClick={handleGoogleLogin}
      disabled={loading}
      sx={{
        px: { xs: 1.25, sm: 2.5 },
        py: { xs: 0.5, sm: 1 },
        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
        lineHeight: 1.6,
        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
        backgroundSize: '200% 200%',
        color: '#fff',
        animation: 'flow 3s ease-in-out infinite',
        '@keyframes flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '& .MuiButton-startIcon > *:nth-of-type(1)': {
          fontSize: { xs: 16, sm: 18 },
        },
        '&:hover': {
          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
          backgroundSize: '200% 200%',
        },
      }}
    >
      {loading ? '登入中...' : 'Google帳號測試（需申請）'}
    </Button>
  );
};

export default GoogleAuthButton;