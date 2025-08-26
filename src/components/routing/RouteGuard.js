import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { 
  isValidAppRoute, 
  attemptRouteRecovery, 
  isPageLoaded, 
  handleOAuthCallback,
  setupRouteRecovery,
  checkStaticAssets
} from '../../utils/routeRecovery';

const RouteGuard = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  useEffect(() => {
    // 設置路由恢復監聽器
    const cleanup = setupRouteRecovery(navigate);
    return cleanup;
  }, [navigate]);

  useEffect(() => {
    // 檢查靜態資源是否正確載入
    checkStaticAssets();
    
    // 檢查當前路由是否需要特殊處理
    const handleRouteValidation = async () => {
      const currentPath = location.pathname;
      
      // 處理 OAuth 回調路由
      handleOAuthCallback(location, navigate);
      
      // 如果是首頁，不需要特殊處理
      if (currentPath === '/') {
        return;
      }
      
      // 檢查是否是有效路由
      if (!isValidAppRoute(currentPath)) {
        console.log('Invalid route detected:', currentPath);
        return; // 讓 NotFound 組件處理
      }
      
      // 檢查是否是深層連結但頁面載入失敗
      if (recoveryAttempts < 2) {
        setIsValidating(true);
        
        // 等待一小段時間讓 React Router 完全載入
        setTimeout(() => {
          if (!isPageLoaded()) {
            console.log('Deep link detected but content not loaded, attempting recovery');
            setRecoveryAttempts(prev => prev + 1);
            attemptRouteRecovery(currentPath, navigate);
          }
          setIsValidating(false);
        }, 1000);
      }
    };

    handleRouteValidation();
  }, [location, navigate, recoveryAttempts]);

  // 在驗證期間顯示載入指示器
  if (isValidating) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          正在載入頁面...
        </Typography>
      </Box>
    );
  }

  return children;
};

export default RouteGuard;