import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Storage as DataIcon
} from '@mui/icons-material';
import { loadStatistics, refreshStatistics } from '../../store/statisticsSlice';

// 錯誤邊界，避免統計組件渲染錯誤影響整頁
class TrafficErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('TrafficDisplay 渲染錯誤:', error, info);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="body2" color="text.secondary">
            無法載入數據統計，已暫時隱藏。
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

const TrafficDisplay = ({ variant = 'full', showRefresh = true }) => {
  const dispatch = useDispatch();
  const { totalDataUsageGB, todayDataUsage, dailyDataUsage, lastUpdated, isLoading, error } = useSelector(state => state.statistics);
  
  // 構建 stats 對象以保持向後兼容
  const stats = {
    totalDataUsageGB: totalDataUsageGB || 0,
    todayDataUsage: todayDataUsage || 0,
    dailyDataUsage: dailyDataUsage || {},
    lastUpdated: lastUpdated
  };

  useEffect(() => {
    // 使用 try-catch 包裹載入邏輯，避免錯誤阻塞頁面
    try {
      dispatch(loadStatistics());
    } catch (error) {
      console.error('載入統計數據失敗:', error);
      dispatch({ type: 'statistics/setError', payload: '載入統計數據失敗' });
    }
  }, [dispatch]);
  
  const handleRefresh = () => {
    dispatch(refreshStatistics());
  };



  const formatDataSize = (gb) => {
    if (gb === undefined || gb === null || isNaN(gb) || gb === 0) {
      return '0 GB';
    }
    if (gb < 1) {
      return (gb * 1024).toFixed(2) + ' MB';
    }
    return gb.toFixed(2) + ' GB';
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>載入統計中...</Typography>
      </Box>
    );
  }

  if (error) {
    // 如果是完整版本且出現錯誤，顯示簡化的統計卡片
    if (variant === 'full') {
      return (
        <Card
          sx={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            color: 'text.primary',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
              <DataIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              數據使用量統計
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              數據使用量統計暫時無法載入
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                數據使用: --
              </Typography>
            </Box>
            {showRefresh && (
              <Box sx={{ mt: 2 }}>
                <IconButton size="small" onClick={handleRefresh} title="重新載入統計">
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}
          </CardContent>
        </Card>
      );
    }
    
    // 簡化版本出現錯誤時顯示最小化的提示
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
        <Typography variant="caption" color="text.secondary">
          📊 數據使用: {formatDataSize(stats.totalDataUsageGB)} | 今日: {formatDataSize(stats.todayDataUsage)}
        </Typography>
        {showRefresh && (
          <IconButton 
            onClick={handleRefresh}
            disabled={isLoading}
            size="small"
            sx={{ ml: 'auto' }}
          >
            {isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
          </IconButton>
        )}
      </Box>
    );
  }

  // 簡化版本 - 只顯示關鍵數據
  if (variant === 'compact') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          📊 總數據使用: {formatDataSize(stats.totalDataUsageGB)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          📅 今日使用: {formatDataSize(stats.todayDataUsage)}
        </Typography>
        {showRefresh && (
          <IconButton size="small" onClick={handleRefresh} title="刷新統計">
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  }

  // 完整版本
  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 背景裝飾 */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }}
      />
      
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            <DataIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            數據使用量統計
          </Typography>
          {showRefresh && (
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              sx={{ ml: 1 }}
              title="重新載入統計"
            >
              <RefreshIcon />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={2}>
          {/* 總數據使用量 */}
          <Grid item xs={6} sm={6}>
            <Box textAlign="center">
              <DataIcon sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                {formatDataSize(stats.totalDataUsageGB)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                總數據使用量
              </Typography>
            </Box>
          </Grid>

          {/* 今日數據使用量 */}
          <Grid item xs={6} sm={6}>
            <Box textAlign="center">
              <DataIcon sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                {formatDataSize(stats.todayDataUsage)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                今日數據使用量
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* 最後更新時間 */}
        {stats.lastUpdated && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 2, 
              opacity: 0.7 
            }}
          >
            最後更新: {new Date(stats.lastUpdated).toLocaleString('zh-TW')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const TrafficDisplayWithBoundary = (props) => (
  <TrafficErrorBoundary>
    <TrafficDisplay {...props} />
  </TrafficErrorBoundary>
);

export default TrafficDisplayWithBoundary;