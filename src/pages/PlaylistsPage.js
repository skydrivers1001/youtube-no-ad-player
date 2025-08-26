import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, Grid, Card, CardContent, CardMedia, CardActionArea, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar } from '@mui/material';
import { FaPlus, FaTrash, FaSync } from 'react-icons/fa';
import { addPlaylist, removeVideoFromPlaylist, setGooglePlaylists, setPlaylistVideos, setGoogleWatchHistory, clearWatchHistory } from '../store/playlistsSlice';
import { syncUserPlaylists, fetchUserPlaylists, fetchPlaylistVideos, fetchWatchHistory } from '../services/authService';
import { keyframes } from '@emotion/react';

// 流動漸層動畫與樣式（用於引人注意的按鈕）
const flowingGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const attentionButtonSx = {
  fontSize: '1.1rem', // 約放大 25%
  px: 2.5,
  py: 1.25,
  background: 'linear-gradient(270deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd)',
  backgroundSize: '400% 400%',
  animation: `${flowingGradient} 8s ease infinite`,
  color: 'white',
  boxShadow: 3,
  border: 'none',
  '&:hover': {
    boxShadow: 6,
    filter: 'brightness(1.05)'
  }
};

const PlaylistsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const playlists = useSelector((state) => state.playlists.playlists);
  const localWatchHistory = useSelector((state) => state.playlists.watchHistory);
  const googleWatchHistory = useSelector((state) => state.playlists.watchHistory.filter(video => video.isFromGoogle));
  const [showGoogleHistory, setShowGoogleHistory] = useState(false);
  
  // 根據當前顯示模式選擇歷史記錄
  const watchHistory = showGoogleHistory ? googleWatchHistory : localWatchHistory;
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [currentTab, setCurrentTab] = useState(0);
  const [showWatchHistory, setShowWatchHistory] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleTabChange = async (event, newValue) => {
    setCurrentTab(newValue);
    
    // 如果切換到 Google 播放清單且該播放清單還沒有載入影片，則自動載入
    const selectedPlaylist = playlists[newValue];
    if (selectedPlaylist && selectedPlaylist.isGooglePlaylist && selectedPlaylist.videos.length === 0 && accessToken) {
      try {
        const videos = await fetchPlaylistVideos(accessToken, selectedPlaylist.googleId);
        dispatch(setPlaylistVideos({ playlistId: selectedPlaylist.id, videos }));
      } catch (error) {
        console.error('載入播放清單影片失敗:', error);
        setSnackbarMessage('載入播放清單影片失敗: ' + error.message);
        setSnackbarOpen(true);
      }
    }
  };

  const handleVideoClick = (video) => {
    navigate(`/watch/${video.id}?title=${encodeURIComponent(video.title)}&channel=${encodeURIComponent(video.channel)}`);
  };

  const handleAddPlaylist = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewPlaylistName('');
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;

    dispatch(addPlaylist(newPlaylistName));
    setCurrentTab(playlists.length); // 切換到新建的播放清單
    handleCloseDialog();
  };
  
  const handleSyncPlaylists = async () => {
    try {
      await syncUserPlaylists();
      setSnackbarMessage('播放清單已成功同步到您的 Google 帳號');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('同步失敗: ' + error.message);
      setSnackbarOpen(true);
    }
  };
  
  const handleFetchPlaylists = async () => {
    try {
      if (!accessToken) {
        setSnackbarMessage('請先登入 Google 帳號');
        setSnackbarOpen(true);
        return;
      }
      
      const googlePlaylists = await fetchUserPlaylists(accessToken);
      dispatch(setGooglePlaylists(googlePlaylists));
      setSnackbarMessage(`已從 Google 帳號載入 ${googlePlaylists.length} 個播放清單`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('載入播放清單失敗:', error);
      setSnackbarMessage('載入失敗: ' + error.message);
      setSnackbarOpen(true);
    }
  };
  
  const handleFetchWatchHistory = async () => {
    try {
      if (!accessToken) {
        setSnackbarMessage('請先登入 Google 帳號');
        setSnackbarOpen(true);
        return;
      }
      
      const history = await fetchWatchHistory(accessToken);
      dispatch(setGoogleWatchHistory(history));
      setSnackbarMessage(`已從 Google 帳號載入 ${history.length} 個稍後觀看影片`);
      setSnackbarOpen(true);
      setShowWatchHistory(true);
    } catch (error) {
      console.error('載入觀看歷史失敗:', error);
      setSnackbarMessage('載入觀看歷史失敗: ' + error.message);
      setSnackbarOpen(true);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleRemoveVideo = (playlistId, videoId, event) => {
    event.stopPropagation(); // 防止觸發卡片點擊事件
    dispatch(removeVideoFromPlaylist({ playlistId, videoId }));
  };

  const currentPlaylist = playlists[currentTab] || { videos: [] };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            我的播放清單
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {isAuthenticated && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<FaSync />}
                  onClick={handleSyncPlaylists}
                >
                  同步到 Google
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FaSync />}
                  onClick={handleFetchPlaylists}
                  sx={attentionButtonSx}
                 >
                   載入播放清單
                 </Button>
                <Button
                  variant="contained"
                  startIcon={<FaSync />}
                  onClick={handleFetchWatchHistory}
                  sx={attentionButtonSx}
                >
                  載入 Google 稍後觀看
                </Button>
              </>
            )}
            <Button
              variant="contained"
              startIcon={<FaPlus />}
              onClick={handleAddPlaylist}
            >
              新增播放清單
            </Button>
            {(localWatchHistory.length > 0 || googleWatchHistory.length > 0) && (
              <Button
                variant={showWatchHistory ? "contained" : "outlined"}
                onClick={() => setShowWatchHistory(!showWatchHistory)}
              >
                {showWatchHistory ? "顯示播放清單" : "顯示觀看歷史"}
              </Button>
            )}
            {showWatchHistory && (localWatchHistory.length > 0 || googleWatchHistory.length > 0) && (
              <Button
                variant={showGoogleHistory ? "contained" : "outlined"}
                onClick={() => setShowGoogleHistory(!showGoogleHistory)}
              >
                {showGoogleHistory ? "本地歷史" : "Google 歷史"}
              </Button>
            )}
          </Box>
        </Box>
        
        {isAuthenticated ? null : (
          <Alert severity="info" sx={{ mb: 2 }}>
            登入 Google 帳號以啟用播放清單同步功能，讓您可以在不同裝置間共享播放清單。
          </Alert>
        )}
        
        {showWatchHistory ? (
          // 顯示觀看歷史
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">
                {showGoogleHistory ? 'Google 稍後觀看' : '本地觀看歷史'} ({watchHistory.length} 個影片)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(localWatchHistory.length > 0 && googleWatchHistory.length > 0) && (
                  <Button
                    variant="outlined"
                    onClick={() => setShowGoogleHistory(!showGoogleHistory)}
                    size="small"
                  >
                    {showGoogleHistory ? '顯示本地歷史' : '顯示 Google 歷史'}
                  </Button>
                )}
                {watchHistory.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      dispatch(clearWatchHistory({ isGoogleHistory: showGoogleHistory }));
                      setSnackbarMessage(`已清除${showGoogleHistory ? 'Google' : '本地'}觀看歷史`);
                      setSnackbarOpen(true);
                    }}
                    size="small"
                  >
                    清除歷史
                  </Button>
                )}
              </Box>
            </Box>
            {watchHistory.length > 0 ? (
              <Grid container spacing={3}>
                {watchHistory.map((video) => (
                  <Grid item xs={12} sm={6} md={4} key={`${video.id}_${video.watchedAt}`}>
                    <Card>
                      <CardActionArea onClick={() => handleVideoClick(video)}>
                        <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                          <CardMedia
                            component="img"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            image={video.thumbnail}
                            alt={video.title}
                          />
                          {video.duration && (
                            <Box sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', px: 1, borderRadius: 1 }}>
                              <Typography variant="caption" color="white">
                                {video.duration}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <CardContent>
                          <Typography variant="subtitle1" component="div" noWrap>
                            {video.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {video.channel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            觀看時間: {new Date(video.watchedAt).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {showGoogleHistory ? 'Google 稍後觀看清單是空的' : '本地觀看歷史是空的'}
                </Typography>
                {showGoogleHistory ? (
                  <Button
                    variant="outlined"
                    onClick={handleFetchWatchHistory}
                    sx={{ mt: 2 }}
                  >
                    載入 Google 稍後觀看
                  </Button>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    開始觀看影片後，歷史記錄會自動出現在這裡
                  </Typography>
                )}
              </Box>
            )}
          </>
        ) : (
          // 顯示播放清單
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                {playlists.map((playlist, index) => (
                  <Tab 
                    key={playlist.id} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {playlist.name}
                        {playlist.isGooglePlaylist && (
                          <Box 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              color: 'white', 
                              px: 1, 
                              py: 0.25, 
                              borderRadius: 1, 
                              fontSize: '0.75rem' 
                            }}
                          >
                            Google
                          </Box>
                        )}
                      </Box>
                    } 
                  />
                ))}
              </Tabs>
            </Box>
            
            {currentPlaylist.videos && currentPlaylist.videos.length > 0 ? (
              <Grid container spacing={3}>
                {currentPlaylist.videos.map((video) => (
                  <Grid item xs={12} sm={6} md={4} key={video.id}>
                    <Card>
                      <CardActionArea onClick={() => handleVideoClick(video)}>
                        <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                          <CardMedia
                            component="img"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            image={video.thumbnail}
                            alt={video.title}
                          />
                          {video.duration && (
                            <Box sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', px: 1, borderRadius: 1 }}>
                              <Typography variant="caption" color="white">
                                {video.duration}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <CardContent>
                          <Typography variant="subtitle1" component="div" noWrap>
                            {video.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {video.channel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            觀看時間: {new Date(video.watchedAt).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                        <Button
                          size="small"
                          startIcon={<FaTrash />}
                          onClick={(e) => handleRemoveVideo(currentPlaylist.id, video.id, e)}
                          color="error"
                        >
                          移除
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  這個播放清單還沒有影片
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/search')}
                  sx={{ mt: 2 }}
                >
                  搜尋影片並添加
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
      
      {/* 新增播放清單對話框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>新增播放清單</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="播放清單名稱"
            type="text"
            fullWidth
            variant="outlined"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleCreatePlaylist} variant="contained">
            建立
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default PlaylistsPage;