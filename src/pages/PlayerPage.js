import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, Paper, Button, Menu, MenuItem } from '@mui/material';
import { FaPlus, FaRegClock, FaRegHeart, FaClock, FaHeart, FaShareAlt, FaCopy } from 'react-icons/fa';
import VideoPlayer from '../components/player/VideoPlayer';
import {
  addVideoToPlaylist,
  addToWatchHistory,
  addToRecentlyPlayed,
  DEFAULT_PLAYLIST_IDS,
  toggleVideoInPlaylist,
} from '../store/playlistsSlice';

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

  const videoInfo = useMemo(() => ({
    id: videoId,
    title: videoTitle,
    channel: channelName,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: '未知',
  }), [channelName, videoId, videoTitle]);

  const watchLaterPlaylist = playlists.find((playlist) => playlist.id === DEFAULT_PLAYLIST_IDS.WATCH_LATER);
  const favoritesPlaylist = playlists.find((playlist) => playlist.id === DEFAULT_PLAYLIST_IDS.FAVORITES);
  const isInWatchLater = Boolean(watchLaterPlaylist?.videos?.some((video) => video.id === videoId));
  const isInFavorites = Boolean(favoritesPlaylist?.videos?.some((video) => video.id === videoId));
  
  // 播放清單選單狀態
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // 處理播放器就绪
  const handlePlayerReady = (player) => {
    // 設置預設播放速度
    player.setPlaybackRate(settings.defaultPlaybackRate);
  };
  
  // 當 videoId 改變時記錄觀看歷史（避免重複記錄）
  useEffect(() => {
    if (videoId && videoTitle) {
      dispatch(addToRecentlyPlayed(videoInfo));
      dispatch(addToWatchHistory(videoInfo));
    }
  }, [dispatch, videoId, videoTitle, videoInfo]);
  
  // 處理添加到播放清單
  const handleAddToPlaylist = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleAddToSpecificPlaylist = (playlistId) => {
    dispatch(addVideoToPlaylist({ playlistId, video: videoInfo }));
    handleMenuClose();
  };

  const handleToggleQuickPlaylist = (playlistId) => {
    dispatch(toggleVideoInPlaylist({ playlistId, video: videoInfo }));
  };

  // 建立本站播放網址；LINE 會依 openExternalBrowser 參數改用系統瀏覽器開啟
  const getShareUrl = () => {
    const shareUrl = new URL(`/watch/${videoId}`, window.location.origin);
    shareUrl.searchParams.set('title', videoTitle);
    shareUrl.searchParams.set('channel', channelName);
    shareUrl.searchParams.set('openExternalBrowser', '1');
    return shareUrl.toString();
  };

  const copyShareUrl = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('本站播放連結已複製');
    } catch (_) {
      window.prompt('請複製本站播放連結', shareUrl);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: videoTitle,
      text: `用 YouTube No AD Player 觀看「${videoTitle}」`,
      url: getShareUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyShareUrl();
    } catch (error) {
      // 使用者關閉分享面板時不顯示錯誤
      if (error?.name !== 'AbortError') {
        await copyShareUrl();
      }
    }
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
          title={videoTitle}
          channelName={channelName}
          onReady={handlePlayerReady}
          autoplay={settings.autoplayVideos}
        />
        
        {/* 影片信息 */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
              <Typography variant="h5" gutterBottom>
                {videoTitle}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {channelName}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <Button
                variant={isInWatchLater ? 'contained' : 'outlined'}
                color={isInWatchLater ? 'warning' : 'inherit'}
                startIcon={isInWatchLater ? <FaClock /> : <FaRegClock />}
                onClick={() => handleToggleQuickPlaylist(DEFAULT_PLAYLIST_IDS.WATCH_LATER)}
              >
                {isInWatchLater ? '已加入稍後觀看' : '稍後觀看'}
              </Button>

              <Button
                variant={isInFavorites ? 'contained' : 'outlined'}
                color={isInFavorites ? 'error' : 'inherit'}
                startIcon={isInFavorites ? <FaHeart /> : <FaRegHeart />}
                onClick={() => handleToggleQuickPlaylist(DEFAULT_PLAYLIST_IDS.FAVORITES)}
              >
                {isInFavorites ? '已收藏' : '收藏'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<FaPlus />}
                onClick={handleAddToPlaylist}
              >
                加入播放清單
              </Button>

              <Button
                variant="outlined"
                startIcon={<FaShareAlt />}
                onClick={handleShare}
              >
                分享本站連結
              </Button>

              <Button
                variant="outlined"
                startIcon={<FaCopy />}
                onClick={copyShareUrl}
              >
                複製連結
              </Button>
            </Box>
            
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
