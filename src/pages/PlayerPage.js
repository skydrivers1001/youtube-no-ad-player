import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, Paper, Button, Menu, MenuItem, CircularProgress } from '@mui/material';
import { FaPlus, FaRegClock, FaRegHeart, FaClock, FaHeart, FaShareAlt, FaCopy, FaRedo, FaExternalLinkAlt } from 'react-icons/fa';
import VideoPlayer from '../components/player/VideoPlayer';
import youtubeService from '../services/youtubeService';
import {
  addVideoToPlaylist,
  addToWatchHistory,
  addToRecentlyPlayed,
  DEFAULT_PLAYLIST_IDS,
  toggleVideoInPlaylist,
} from '../store/playlistsSlice';

const hasMeaningfulValue = (value, fallbackLabel) => Boolean(value && value !== fallbackLabel);

const PlayerPage = () => {
  const { videoId, playlistId: playlistRouteId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const urlVideoTitle = searchParams.get('title');
  const urlChannelName = searchParams.get('channel');

  // 從 /watch/playlist/:playlistId 進入時，playlistRouteId 就是清單 ID
  const activePlaylistId = playlistRouteId || searchParams.get('list');

  // 播放清單狀態
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [playlistLoadFailed, setPlaylistLoadFailed] = useState(false);
  
  // 從Redux獲取設置和播放清單
  const settings = useSelector((state) => state.settings);
  const playlists = useSelector((state) => state.playlists.playlists);
  const recentlyPlayed = useSelector((state) => state.playlists.recentlyPlayed);
  const watchHistory = useSelector((state) => state.playlists.watchHistory);
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const [fetchedVideoMeta, setFetchedVideoMeta] = useState({ title: '', channel: '' });
  const playerRef = useRef(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const loadedPlaylistIdRef = useRef(null);

  // 播放清單：偵測到 activePlaylistId 時，載入清單內的影片
  useEffect(() => {
    if (!activePlaylistId) {
      loadedPlaylistIdRef.current = null;
      setPlaylistVideos([]);
      setPlaylistInfo(null);
      return undefined;
    }

    if (loadedPlaylistIdRef.current === activePlaylistId && playlistVideos.length > 0) {
      return undefined;
    }

    let isCancelled = false;
    setPlaylistLoadFailed(false);
    const loadPlaylist = async () => {
      try {
        const [info, videos] = await Promise.all([
          youtubeService.getPlaylistInfo(activePlaylistId, accessToken),
          youtubeService.getPlaylistVideos(activePlaylistId, accessToken),
        ]);
        if (isCancelled) return;
        loadedPlaylistIdRef.current = activePlaylistId;
        setPlaylistInfo(info);
        setPlaylistVideos(videos || []);

        // 從 /watch/playlist/:playlistId 進入且尚未指定影片時，導向第一支
        if (playlistRouteId && !videoId) {
          const targetVideo = (videos && videos.length > 0)
            ? videos[Math.min(Math.max(0, Number(searchParams.get('index') || 0)), videos.length - 1)]
            : (info?.firstVideoId ? { id: info.firstVideoId } : null);

          if (targetVideo?.id) {
            navigate(`/watch/${targetVideo.id}?list=${activePlaylistId}`, { replace: true });
          } else {
            setPlaylistLoadFailed(true);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('載入播放清單失敗:', error);
          setPlaylistLoadFailed(true);
        }
      }
    };

    loadPlaylist();
    return () => {
      isCancelled = true;
    };
  }, [accessToken, activePlaylistId, playlistRouteId, videoId, navigate, searchParams, playlistVideos.length]);

  // 計算目前影片在清單中的 index
  const playlistLabel = playlistInfo?.title || '';
  const effectivePlaylistIndex = useMemo(() => {
    if (!playlistVideos.length) return 0;
    const idx = playlistVideos.findIndex((v) => v.id === videoId);
    return idx >= 0 ? idx : 0;
  }, [playlistVideos, videoId]);

  // 當播放清單切換時，同步 index 狀態
  useEffect(() => {
    setCurrentPlaylistIndex(effectivePlaylistIndex);
  }, [effectivePlaylistIndex]);

  const cachedVideoInfo = useMemo(() => {
    const playedVideo = recentlyPlayed.find((video) => video.id === videoId);
    if (playedVideo) {
      return playedVideo;
    }
    return watchHistory.find((video) => video.id === videoId) || null;
  }, [recentlyPlayed, videoId, watchHistory]);

  const shouldFetchVideoMeta = !hasMeaningfulValue(urlVideoTitle, '影片')
    || !hasMeaningfulValue(urlChannelName, '頻道');

  const cachedVideoTitle = hasMeaningfulValue(cachedVideoInfo?.title, '影片')
    ? cachedVideoInfo.title
    : '';
  const cachedChannelName = hasMeaningfulValue(cachedVideoInfo?.channel, '頻道')
    ? cachedVideoInfo.channel
    : '';

  useEffect(() => {
    let isCancelled = false;

    if (!videoId || !shouldFetchVideoMeta) {
      setFetchedVideoMeta({ title: '', channel: '' });
      return undefined;
    }

    const fetchVideoMeta = async () => {
      try {
        const response = await youtubeService.getVideoDetails(videoId, accessToken);
        const item = response?.data?.items?.[0];

        if (!isCancelled && item) {
          setFetchedVideoMeta({
            title: item.title || '',
            channel: item.channel || '',
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setFetchedVideoMeta({ title: '', channel: '' });
        }
      }
    };

    fetchVideoMeta();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, shouldFetchVideoMeta, videoId]);

  const videoTitle = hasMeaningfulValue(urlVideoTitle, '影片')
    ? urlVideoTitle
    : (fetchedVideoMeta.title || cachedVideoTitle || '影片');

  const channelName = hasMeaningfulValue(urlChannelName, '頻道')
    ? urlChannelName
    : (fetchedVideoMeta.channel || cachedChannelName || '頻道');

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

    // YouTube 播放器本身也會提供影片標題與頻道，可避開 API 金鑰或 CORS 限制。
    const playerVideoData = player.getVideoData?.();
    if (playerVideoData?.title) {
      setFetchedVideoMeta((current) => ({
        title: playerVideoData.title || current.title,
        channel: playerVideoData.author || current.channel,
      }));
    }

    // 若為播放清單，透過播放器內建清單 API 嘗試動態補充影片列表
    if (activePlaylistId) {
      const playlistIds = player.getPlaylist?.();
      if (Array.isArray(playlistIds) && playlistIds.length > 0) {
        setPlaylistVideos((prev) => {
          if (prev.length <= 1 && playlistIds.length > 1) {
            return playlistIds.map((id, index) => ({
              id,
              title: (index === 0 && (playerVideoData?.title || playlistInfo?.title)) 
                ? (playerVideoData?.title || playlistInfo?.title) 
                : `影片 #${index + 1}`,
              channel: playerVideoData?.author || playlistInfo?.channel || 'YouTube',
              thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              position: index,
            }));
          }
          return prev;
        });
      }
    }
  };
  
  // 當 videoId 改變時記錄觀看歷史（避免重複記錄）
  useEffect(() => {
    if (
      videoId
      && hasMeaningfulValue(videoTitle, '影片')
      && hasMeaningfulValue(channelName, '頻道')
    ) {
      dispatch(addToRecentlyPlayed(videoInfo));
      dispatch(addToWatchHistory(videoInfo));
    }
  }, [channelName, dispatch, videoId, videoTitle, videoInfo]);
  
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

  const handleVideoChange = useCallback((nextVideo) => {
    if (!nextVideo?.id) return;
    const listParam = activePlaylistId ? `?list=${activePlaylistId}` : '';
    const titleParam = nextVideo.title ? `&title=${encodeURIComponent(nextVideo.title)}` : '';
    const channelParam = nextVideo.channel ? `&channel=${encodeURIComponent(nextVideo.channel)}` : '';
    navigate(`/watch/${nextVideo.id}${listParam}${titleParam}${channelParam}`, { replace: true });
  }, [activePlaylistId, navigate]);

  if (playlistRouteId && !videoId) {
    if (playlistLoadFailed) {
      return (
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h6" color="error" gutterBottom>
              無法載入播放清單內容
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              清單可能為私人清單、已刪除，或 YouTube API 配額受限。
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              回到首頁
            </Button>
          </Paper>
        </Container>
      );
    }
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="h6">正在載入播放清單...</Typography>
        {playlistInfo?.title && (
          <Typography variant="body2" color="text.secondary">
            {playlistInfo.title}
          </Typography>
        )}
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* 視頻播放器 */}
        <VideoPlayer 
          ref={playerRef}
          videoId={videoId} 
          title={videoTitle}
          channelName={channelName}
          onReady={handlePlayerReady}
          autoplay={settings.autoplayVideos}
          playlistId={activePlaylistId}
          playlistVideos={playlistVideos}
          initialVideoIndex={effectivePlaylistIndex}
          playlistLabel={playlistLabel}
          onVideoChange={handleVideoChange}
          loopEnabled={loopEnabled}
          onLoopChange={setLoopEnabled}
        />
        
        {/* 影片信息 */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ width: '100%', minWidth: 0 }}>
              <Typography variant="h5" gutterBottom>
                {videoTitle}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {channelName}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-start' }}>
              <Button
                variant={loopEnabled ? 'contained' : 'outlined'}
                color={loopEnabled ? 'primary' : 'inherit'}
                startIcon={<FaRedo />}
                onClick={() => {
                  if (playerRef.current?.toggleLoop) {
                    playerRef.current.toggleLoop();
                  } else {
                    setLoopEnabled((prev) => !prev);
                  }
                }}
              >
                {loopEnabled ? '循環播放：開啟' : '循環播放'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<FaExternalLinkAlt />}
                onClick={() => {
                  playerRef.current?.togglePictureInPicture?.();
                }}
              >
                畫中畫
              </Button>

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

            {playlistVideos.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {playlistLabel ? `播放清單：${playlistLabel}` : '播放清單'}（{currentPlaylistIndex + 1} / {playlistVideos.length}）
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto', pb: 1 }}>
                  {playlistVideos.map((video, index) => (
                    <Box
                      key={video.id}
                      onClick={() => {
                        playerRef.current?.loadVideo(video.id);
                        navigate(`/watch/${video.id}?list=${activePlaylistId}`);
                      }}
                      sx={{
                        flexShrink: 0,
                        width: 140,
                        cursor: 'pointer',
                        border: index === currentPlaylistIndex ? 2 : 1,
                        borderColor: index === currentPlaylistIndex ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <img src={video.thumbnail} alt={video.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      </Box>
                      <Box sx={{ p: 0.75 }}>
                        <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 130 }}>
                          {video.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 130 }}>
                          {video.channel}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
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
