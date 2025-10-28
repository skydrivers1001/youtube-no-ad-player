import React from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 以顯示錯誤 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤詳情
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // 在生產環境停用自動重試，避免持續迴圈
    const isProdLike = typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost';

    // 如果是路由相關錯誤，嘗試自動恢復（僅開發環境）
    if (!isProdLike && this.isRoutingError(error) && this.state.retryCount < 2) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000);
    }
  }

  isRoutingError = (error) => {
    const routingErrorKeywords = [
      'router',
      'navigation',
      'route',
      'history',
      'location'
    ];
    
    const errorMessage = (error && error.message ? error.message : '').toLowerCase();
    return routingErrorKeywords.some(keyword => errorMessage.includes(keyword));
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  }

  handleGoHome = () => {
    // 重置錯誤狀態並導航到首頁
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
    
    // 使用 window.location 確保完全重新載入
    window.location.href = '/';
  }

  handleRefresh = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              gap: 3,
              textAlign: 'center'
            }}
          >
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                應用程式發生錯誤
              </Typography>
              <Typography variant="body2">
                抱歉，應用程式遇到了意外錯誤。這可能是由於網路問題或路由配置問題導致的。
              </Typography>
            </Alert>

            {this.state.error && (
              <Box
                sx={{
                  width: '100%',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  textAlign: 'left'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  錯誤詳情：
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                size="large"
              >
                重試
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                size="large"
              >
                回到首頁
              </Button>
              
              <Button
                variant="text"
                onClick={this.handleRefresh}
                size="large"
              >
                重新整理頁面
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              如果問題持續存在，請嘗試清除瀏覽器快取或聯繫技術支援。
            </Typography>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;