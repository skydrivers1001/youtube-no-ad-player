import React, { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 檢查是否是有效的應用路由，如果是則嘗試重新導向
  useEffect(() => {
    const validRoutes = [
      '/',
      '/search',
      '/playlists',
      '/settings',
      '/auth/google/callback'
    ];
    
    const currentPath = location.pathname;
    
    // 檢查是否是 /watch/ 路由
    if (currentPath.startsWith('/watch/')) {
      // 如果是 watch 路由但格式不正確，導向首頁
      const videoIdMatch = currentPath.match(/\/watch\/([a-zA-Z0-9_-]+)/);
      if (!videoIdMatch) {
        console.log('Invalid video URL format, redirecting to home');
        navigate('/', { replace: true });
        return;
      }
    }
    
    // 如果是已知的有效路由，可能是伺服器端重寫問題
    if (validRoutes.includes(currentPath)) {
      console.log('Valid route detected, attempting client-side navigation');
      // 使用 replace 避免在瀏覽器歷史中留下 404 記錄
      navigate(currentPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: 3
        }}
      >
        <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'text.secondary' }}>
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom>
          頁面未找到
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          抱歉，您訪問的頁面不存在或已被移動。
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          當前路徑：{location.pathname}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            size="large"
          >
            回到首頁
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size="large"
          >
            重新整理
          </Button>
        </Box>
        
        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>提示：</strong>如果您是通過直接輸入網址訪問此頁面，請確保網址正確。
            如果問題持續存在，請嘗試重新整理頁面或聯繫管理員。
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFound;