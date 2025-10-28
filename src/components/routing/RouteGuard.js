import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { 
  isValidAppRoute, 
  attemptRouteRecovery, 
  isPageLoaded, 
  handleOAuthCallback,
  setupRouteRecovery,
  checkStaticAssets
} from '../../utils/routeRecovery';
import telemetry from '../../utils/telemetry';

// Feature flag: temporarily disable route recovery to isolate flicker
const ENABLE_ROUTE_RECOVERY = false;

const RouteGuard = ({ children }) => {
  const location = useLocation();

  // 記錄路由切換事件（Render 調試）
  useEffect(() => {
    telemetry.logEvent('route_change', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash]);

  // 暫時完全停用所有路由守衛邏輯以排查重載問題
  return children;
};

export default RouteGuard;