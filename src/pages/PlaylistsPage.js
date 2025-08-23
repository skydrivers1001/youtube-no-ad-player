import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, Grid, Card, CardContent, CardMedia, CardActionArea, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar } from '@mui/material';
import { FaPlus, FaTrash, FaEdit, FaSync } from 'react-icons/fa';
import { addPlaylist, removeVideoFromPlaylist } from '../store/playlistsSlice';
import { syncUserPlaylists, fetchUserPlaylists } from '../services/authService';

const PlaylistsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const playlists = useSelector((state) => state.playlists.playlists);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
      await fetchUserPlaylists();
      setSnackbarMessage('已從 Google 帳號載入播放清單');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('載入失敗: ' + error.message);
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
          <Box sx={{ display: 'flex', gap: 2 }}>
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
                  variant="outlined"
                  startIcon={<FaSync />}
                  onClick={handleFetchPlaylists}
                >
                  從 Google 載入
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
          </Box>
        </Box>
        
        {isAuthenticated ? null : (
          <Alert severity="info" sx={{ mb: 2 }}>
            登入 Google 帳號以啟用播放清單同步功能，讓您可以在不同裝置間共享播放清單。
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {playlists.map((playlist, index) => (
              <Tab key={playlist.id} label={playlist.name} />
            ))}
          </Tabs>
        </Box>
        
        {currentPlaylist.videos && currentPlaylist.videos.length > 0 ? (
          <Grid container spacing={3}>
            {currentPlaylist.videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} key={video.id}>
                <Card>
                  <CardActionArea onClick={() => handleVideoClick(video)}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={video.thumbnail}
                      alt={video.title}
                    />
                    <Box sx={{ position: 'absolute', bottom: 60, right: 8, bgcolor: 'rgba(0,0,0,0.7)', px: 1, borderRadius: 1 }}>
                      <Typography variant="caption" color="white">
                        {video.duration}
                      </Typography>
                    </Box>
                    <CardContent>
                      <Typography variant="subtitle1" component="div" noWrap>
                        {video.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {video.channel}
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