import React, { useState } from 'react';
import { Box, Typography, Container, Grid, TextField, Button, InputAdornment } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { FaYoutube } from 'react-icons/fa';

const HomePage = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // 從 YouTube URL 提取影片 ID
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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
    
    const videoId = extractVideoId(youtubeUrl);
    
    if (videoId) {
      setError('');
      navigate(`/watch/${videoId}`);
    } else {
      setError('無效的 YouTube 影片網址');
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Youtuber No AD - 專心看 YouTube 的播放器
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          沒有干擾、乾淨體驗、流暢操作
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
              <Typography variant="h6">影片播放</Typography>
              <Typography variant="body2">
                全螢幕播放、畫質切換、倍速控制、字幕支援、背景播放、畫中畫
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
              <Typography variant="h6">介面簡化</Typography>
              <Typography variant="body2">
                無推薦牆、無留言區、無干擾側欄，單純顯示影片內容
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
              <Typography variant="h6">播放清單 & 收藏</Typography>
              <Typography variant="body2">
                建立自己的清單、收藏影片/頻道、播放進度記錄
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            開始使用
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="貼上 YouTube 影片網址"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              error={!!error}
              helperText={error}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FaYoutube color="red" size={24} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <Button 
                    variant="contained" 
                    color="primary" 
                    type="submit"
                    sx={{ ml: 1 }}
                  >
                    播放
                  </Button>
                )
              }}
            />
          </Box>
          
          <Typography variant="body1">
            <Link to="/search" style={{ textDecoration: 'none' }}>
              搜尋影片
            </Link>
            {' | '}
            <Link to="/playlists" style={{ textDecoration: 'none' }}>
              我的播放清單
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;