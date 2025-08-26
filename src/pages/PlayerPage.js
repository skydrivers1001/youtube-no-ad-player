import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, IconButton, Paper, Button, Menu, MenuItem } from '@mui/material';
import { FaList, FaPlus } from 'react-icons/fa';
import VideoPlayer from '../components/player/VideoPlayer';
import { addVideoToPlaylist, addToWatchHistory, addToRecentlyPlayed } from '../store/playlistsSlice';

const PlayerPage = () => {
  const { videoId } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // 從URL參數獲取影片信息
  const videoTitle = new URLSearchParams(location.search).get('title') || '影片';
  const channelName = new URLSearchParams(location.search).get('channel') || '頻道';
  
  // 從Redux獲取設置和播放清單
  const settings = useSelector((state) => state.settings);
  const playlists = useSelector((state) => state.playlists.playlists);
  
  // 播放清單選單狀態
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // 處理播放器就緒
  const handlePlayerReady = (player) => {
    // 設置預設播放速度
    player.setPlaybackRate(settings.defaultPlaybackRate);
  };
  
  // 當 videoId 改變時記錄觀看歷史（避免重複記錄）
  useEffect(() => {
    if (videoId && videoTitle) {
      const videoInfo = {
        id: videoId,
        title: videoTitle,
        channel: channelName,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
      
      dispatch(addToRecentlyPlayed(videoInfo));
      dispatch(addToWatchHistory(videoInfo));
    }
  }, [videoId, videoTitle, channelName, dispatch]);
  
  // 處理添加到播放清單
  const handleAddToPlaylist = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleAddToSpecificPlaylist = (playlistId) => {
    const videoInfo = {
      id: videoId,
      title: videoTitle,
      channel: channelName,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: '未知', // 實際應用中應該從API獲取
    };
    
    dispatch(addVideoToPlaylist({ playlistId, video: videoInfo }));
    handleMenuClose();
  };
  
  // 睡眠定時器
  useEffect(() => {
    if (settings.sleepTimerMinutes > 0) {
      const timer = setTimeout(() => {
        // 在實際應用中，這裡應該暫停播放
        alert(`睡眠定時器已啟動，播放已在 ${settings.sleepTimerMinutes} 分鐘後停止`);
      }, settings.sleepTimerMinutes * 60 * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [settings.sleepTimerMinutes]);
  
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* 視頻播放器 */}
        <VideoPlayer 
          videoId={videoId} 
          onReady={handlePlayerReady}
          autoplay={settings.autoplayVideos}
        />
        
        {/* 影片信息 */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {videoTitle}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {channelName}
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<FaPlus />}
              onClick={handleAddToPlaylist}
            >
              加入播放清單
            </Button>
            
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
            >
              {playlists.map((playlist) => (
                <MenuItem 
                  key={playlist.id} 
                  onClick={() => handleAddToSpecificPlaylist(playlist.id)}
                >
                  {playlist.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
      </Paper>
      
      {/* 專注模式切換按鈕 */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button variant="text">
          切換專注模式 (僅顯示影片)
        </Button>
      </Box>
    </Container>
  );
};

export default PlayerPage;