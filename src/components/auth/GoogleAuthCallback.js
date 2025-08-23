import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress } from '@mui/material';
import { exchangeCodeForToken } from '../../services/authService';
import { loginSuccess, loginFailure } from '../../store/authSlice';

const GoogleAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 從 URL 獲取授權碼
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          throw new Error('未收到授權碼');
        }

        // 交換授權碼獲取訪問令牌
        const authData = await exchangeCodeForToken(code);
        
        // 更新 Redux 狀態
        dispatch(loginSuccess(authData));
        
        // 重定向到設置頁面
        navigate('/settings');
      } catch (error) {
        console.error('Google 認證回調錯誤:', error);
        setError(error.message || '登入失敗，請重試');
        dispatch(loginFailure(error.message || '登入失敗，請重試'));
        
        // 3秒後重定向到首頁
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [dispatch, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 3,
      }}
    >
      {error ? (
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      ) : (
        <>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            正在處理 Google 登入...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default GoogleAuthCallback;