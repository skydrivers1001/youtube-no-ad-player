import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Container, Grid, TextField, Button, InputAdornment, Paper, Card, CardContent, Fade, Grow } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { FaYoutube, FaPlay, FaList, FaSearch } from 'react-icons/fa';
import TrafficDisplay from '../components/statistics/TrafficDisplay';

const HomePage = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const settings = useSelector((state) => state.settings);
  
  // 從 YouTube URL 提取影片 ID
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // 處理 YouTube URL 提交
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setError('請輸入 YouTube 影片網址');
      return;
    }
    
    // 檢查是否為網站本身的網址
    const isOwnSiteUrl = youtubeUrl.includes('youtube-no-ad-player.onrender.com') || 
                        youtubeUrl.includes('localhost:3000');
    
    if (isOwnSiteUrl) {
      // 如果是網站本身的網址，檢查是否包含影片 ID
      const urlParts = youtubeUrl.split('/watch/');
      if (urlParts.length > 1 && urlParts[1]) {
        const videoId = urlParts[1].split('?')[0].split('#')[0]; // 移除查詢參數和錨點
        if (videoId && videoId.length === 11) {
          setError('');
          navigate(`/watch/${videoId}`);
          return;
        }
      }
      // 如果是網站首頁網址，清空輸入框並提示
      setYoutubeUrl('');
      setError('');
      return;
    }
    
    const videoId = extractVideoId(youtubeUrl);
    
    if (videoId) {
      setError('');
      navigate(`/watch/${videoId}`);
    } else {
      setError('無效的 YouTube 影片網址');
    }
  };
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 8,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography 
              variant="h2" 
              component="h1" 
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              Youtube No AD
            </Typography>
            <Typography 
              variant="h5" 
              sx={{
                color: 'rgba(255,255,255,0.9)',
                mb: 4,
                fontWeight: 300,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}
            >
              專心看 YouTube 的極簡播放器
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{
                color: 'rgba(255,255,255,0.8)',
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6
              }}
            >
              沒有干擾、乾淨體驗、流暢操作
            </Typography>
          </Box>
        </Fade>

        {/* Main Action Section - 功能區塊 */}
        <Grow in timeout={1200}>
          <Paper
            elevation={24}
            sx={{
              p: 4,
              mb: 6,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                textAlign: 'center', 
                mb: 4, 
                fontWeight: 600,
                color: '#2c3e50'
              }}
            >
              開始使用
            </Typography>
            
            {/* URL Input */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="貼上 YouTube 影片網址"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                error={!!error}
                helperText={error}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(0,0,0,0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaYoutube color="#FF0000" size={24} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <Button 
                      variant="contained" 
                      type="submit"
                      startIcon={<FaPlay />}
                      sx={{ 
                        ml: 1,
                        borderRadius: 2,
                        background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                        boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                        }
                      }}
                    >
                      播放
                    </Button>
                  )
                }}
              />
            </Box>

            {/* Quick Action Buttons */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mb: 3, 
                  color: '#7f8c8d',
                  fontWeight: 500
                }}
              >
                或者使用其他功能
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                <Grid item>
                  <Button
                    component={Link}
                    to="/search"
                    variant="contained"
                    startIcon={<FaSearch />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
                      fontSize: '1rem',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      },
                    }}
                  >
                    搜尋影片
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    component={Link}
                    to="/playlists"
                    variant="contained"
                    startIcon={<FaList />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
                      fontSize: '1rem',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      },
                    }}
                  >
                    我的播放清單
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grow>
        
        {/* Feature Introduction Section - 宣傳區塊 */}
        <Fade in timeout={1600}>
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                textAlign: 'center', 
                mb: 2, 
                fontWeight: 600,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              為什麼選擇 Youtube No AD？
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                textAlign: 'center', 
                mb: 5, 
                color: 'rgba(255,255,255,0.8)',
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              專為專注觀看而設計的 YouTube 播放器
            </Typography>
            
            <Grid container spacing={3} justifyContent="center">
               {[
                 {
                   icon: <FaPlay size={28} />,
                   title: '強大的影片播放功能',
                   description: '全螢幕播放、畫質切換、倍速控制、字幕支援、背景播放、畫中畫',
                   delay: 1800
                 },
                 {
                   icon: <Box sx={{ fontSize: 28 }}>✨</Box>,
                   title: '極簡乾淨的介面',
                   description: '無推薦牆、無留言區、無干擾側欄，讓你專注於影片內容',
                   delay: 2000
                 },
                 {
                   icon: <FaList size={28} />,
                   title: '個人化播放管理',
                   description: '建立專屬播放清單、收藏喜愛影片和頻道、自動記錄播放進度',
                   delay: 2200
                 }
               ].map((feature, index) => (
                 <Grid item xs={12} sm={6} md={4} key={index}>
                  <Grow in timeout={feature.delay}>
                    <Card
                      elevation={8}
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          background: 'rgba(255,255,255,0.2)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Box
                          sx={{
                            color: 'rgba(255,255,255,0.9)',
                            mb: 2,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            mb: 2, 
                            fontWeight: 600,
                            color: 'white',
                            fontSize: '1.1rem'
                          }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.6,
                            fontSize: '0.9rem'
                          }}
                        >
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>
        
        {/* Traffic Statistics Section - 流量統計區塊 */}
        {settings.showTrafficStats && (
          <Grow in timeout={2400}>
            <Box sx={{ mb: 6 }}>
              <Box sx={{ 
                '& .MuiAlert-root': { 
                  mb: 2 
                }
                // 移除隱藏載入指示器的樣式，顯示 CircularProgress 以利除錯
              }}>
                <TrafficDisplay variant="full" />
              </Box>
            </Box>
          </Grow>
        )}
      </Container>
    </Box>
  );
};

export default HomePage;