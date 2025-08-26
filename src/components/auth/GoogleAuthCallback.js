import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress } from '@mui/material';
// 不再需要 exchangeCodeForToken，使用隱式授權流程
import { loginSuccess, loginFailure } from '../../store/authSlice';

const GoogleAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 從 URL fragment 獲取 access token（隱式授權流程）
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error');

        if (error) {
          throw new Error(`OAuth 錯誤: ${error}`);
        }

        if (!accessToken) {
          throw new Error('未收到訪問令牌');
        }

        // 獲取用戶信息
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!userInfoResponse.ok) {
          throw new Error('無法獲取用戶信息');
        }

        const userInfo = await userInfoResponse.json();

        // 構建認證數據
        const authData = {
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          },
          accessToken,
          expiresAt: Date.now() + (parseInt(expiresIn) * 1000),
        };

        // 保存到本地存儲
        localStorage.setItem('youtuber_no_ad_auth', JSON.stringify(authData));
        
        // 更新 Redux 狀態
        dispatch(loginSuccess(authData));
        
        // 重定向到設置頁面
        navigate('/settings');
      } catch (error) {
        console.error('Google 認證回調錯誤:', error);
        const errorMessage = error.message || '登入失敗，請重試';
        setError(errorMessage);
        dispatch(loginFailure(errorMessage));
        
        // 如果是 401 錯誤，提供更具體的指導
        if (errorMessage.includes('401') || errorMessage.includes('認證失敗')) {
          console.error('可能的解決方案:');
          console.error('1. 檢查 .env.local 文件中的 REACT_APP_GOOGLE_CLIENT_ID 是否正確設定');
          console.error('2. 確認 Google Cloud Console 中的重定向 URI 設定正確');
          console.error('3. 檢查 Google OAuth 應用程式的狀態是否為已發布');
        }
        
        // 5秒後重定向到首頁，給用戶更多時間閱讀錯誤信息
        setTimeout(() => {
          navigate('/');
        }, 5000);
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