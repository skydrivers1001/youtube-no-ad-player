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

// Feature flag: temporarily disable route recovery to isolate flicker
const ENABLE_ROUTE_RECOVERY = false;

const RouteGuard = ({ children }) => {
  // 暫時完全停用所有路由守衛邏輯以排查重載問題
  return children;
};

export default RouteGuard;