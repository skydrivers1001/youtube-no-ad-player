import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Box, IconButton, Slider, Typography, Paper, Tooltip } from '@mui/material';
import {
  FaPlay,
  FaPause,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaForward,
  FaBackward,
  FaExternalLinkAlt,
  FaClosedCaptioning
} from 'react-icons/fa';
import YouTube from 'react-youtube';
import usePictureInPicture from '../../hooks/usePictureInPicture';
import { updateVideoProgress, selectVideoProgress, markVideoCompleted } from '../../store/progressSlice';
import { recordDataUsage } from '../../store/statisticsSlice';

const NOTICE_AUTO_HIDE_MS = 3500;

const VideoPlayer = ({
  videoId,
  title = '影片',
  channelName = '頻道',
  onReady,
  autoplay = true,
}) => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const savedProgress = useSelector((state) => selectVideoProgress(state, videoId));

  const [player, setPlayer] = useState(null);
  const playerRef = useRef(null);
  const [playerState, setPlayerState] = useState({
    playing: false,
    volume: 80,
    muted: false,
    playbackRate: settings.defaultPlaybackRate || 1,
    fullscreen: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    focusMode: false,
    subtitlesEnabled: settings.defaultSubtitlesEnabled !== false,
  });
  const playerStateRef = useRef(playerState);

  const [showControls, setShowControls] = useState(true);
  const [playbackNotice, setPlaybackNotice] = useState(null);
  const controlsTimeoutRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const backgroundPausedRef = useRef(false);
  const dataUsageIntervalRef = useRef(null);

  const ENABLE_CONTROL_AUTO_HIDE = false;

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // 讓整個播放器容器能進入真正的瀏覽器全螢幕
  const containerRef = useRef(null);

  const showNotice = useCallback((message, severity = 'info') => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }

    setPlaybackNotice({ message, severity });
    noticeTimeoutRef.current = setTimeout(() => {
      setPlaybackNotice(null);
    }, NOTICE_AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  // 同步監聽 Fullscreen 變化（避免使用者透過 ESC 或系統手勢退出時狀態不同步）
  useEffect(() => {
    const handleFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
      const isFs = !!fsEl && (fsEl === containerRef.current || containerRef.current?.contains(fsEl));
      setPlayerState((prev) => ({ ...prev, fullscreen: isFs }));
      document.body.style.overflow = isFs ? 'hidden' : '';
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('msfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('msfullscreenchange', handleFsChange);
    };
  }, []);

  const [dataUsageTracker, setDataUsageTracker] = useState({
    lastRecordedTime: 0,
    totalWatchTime: 0,
    estimatedDataUsage: 0
  });

  const buildEmbedUrl = useCallback(({ autoplay: pipAutoplay, startSeconds }) => {
    const language = settings.defaultSubtitleLanguage === 'auto'
      ? 'zh-TW'
      : settings.defaultSubtitleLanguage;
    const params = new URLSearchParams({
      autoplay: pipAutoplay ? '1' : '0',
      start: String(Math.max(0, Math.floor(startSeconds || 0))),
      playsinline: '1',
      controls: '1',
      rel: '0',
      modestbranding: '1',
      iv_load_policy: '3',
    });

    if (settings.defaultSubtitlesEnabled && language !== 'none') {
      params.set('cc_load_policy', '1');
      params.set('hl', language);
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [settings.defaultSubtitleLanguage, settings.defaultSubtitlesEnabled, videoId]);

  const {
    isPipSupported,
    isPipActive,
    supportMode,
    togglePictureInPicture
  } = usePictureInPicture({
    enabled: settings.enablePictureInPicture,
    buildEmbedUrl,
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
    getShouldResumePlayback: () => !document.hidden,
    onEnter: ({ wasPlaying }) => {
      if (wasPlaying) {
        playerRef.current?.pauseVideo?.();
      }
      showNotice('已切換到小窗播放', 'info');
    },
    onExit: ({ estimatedCurrentTime, resumePlaybackInSource }) => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) {
        return;
      }

      currentPlayer.seekTo(estimatedCurrentTime, true);
      if (resumePlaybackInSource) {
        currentPlayer.playVideo();
      }
      showNotice('已回到頁面播放器', 'success');
    },
  });

  const opts = useMemo(() => ({
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: isTouchDevice ? 1 : 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      cc_load_policy: settings.defaultSubtitlesEnabled ? 1 : 0,
      hl: settings.defaultSubtitleLanguage === 'auto' ? 'zh-TW' : settings.defaultSubtitleLanguage,
      playsinline: 1,
    },
  }), [
    autoplay,
    isTouchDevice,
    settings.defaultSubtitleLanguage,
    settings.defaultSubtitlesEnabled,
  ]);

  const playerStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
  }), []);

  const startDataUsageTracking = useCallback(() => {
    if (dataUsageIntervalRef.current) return;
    const startTime = Date.now();
    setDataUsageTracker((prev) => ({ ...prev, lastRecordedTime: startTime }));
  }, []);

  const stopDataUsageTracking = useCallback(() => {
    if (dataUsageIntervalRef.current) {
      clearInterval(dataUsageIntervalRef.current);
      dataUsageIntervalRef.current = null;
      if (dataUsageTracker.estimatedDataUsage > 0) {
        dispatch(recordDataUsage(dataUsageTracker.estimatedDataUsage));
        setDataUsageTracker((prev) => ({ ...prev, estimatedDataUsage: 0 }));
      }
    }
  }, [dispatch, dataUsageTracker.estimatedDataUsage]);

  const updatePlaybackState = useCallback((updater) => {
    setPlayerState((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      playerStateRef.current = nextState;
      return nextState;
    });
  }, []);

  const syncCurrentTime = useCallback((nextTime) => {
    updatePlaybackState((prev) => ({
      ...prev,
      currentTime: nextTime,
    }));
  }, [updatePlaybackState]);

  const seekRelative = useCallback((seconds) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    const duration = playerStateRef.current.duration || currentPlayer.getDuration?.() || 0;
    const newTime = Math.max(0, Math.min(duration, (currentPlayer.getCurrentTime?.() || 0) + seconds));
    currentPlayer.seekTo(newTime, true);
    syncCurrentTime(newTime);
  }, [syncCurrentTime]);

  const handleReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    playerRef.current = ytPlayer;
    ytPlayer.setPlaybackRate(playerStateRef.current.playbackRate);
    ytPlayer.setVolume(playerStateRef.current.volume);

    if (videoId) {
      dispatch(recordDataUsage(5));
    }

    if (savedProgress && savedProgress.currentTime > 5) {
      ytPlayer.seekTo(savedProgress.currentTime, true);
    }

    if (onReady) {
      onReady(ytPlayer);
    }
  }, [dispatch, onReady, savedProgress, videoId]);

  const handleStateChange = useCallback((event) => {
    const ytPlayer = event.target;
    const isPlaying = event.data === 1;
    const isEnded = event.data === 0;

    updatePlaybackState((prev) => ({
      ...prev,
      playing: isPlaying,
      duration: ytPlayer.getDuration?.() || 0,
    }));

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    if (isPlaying) {
      startDataUsageTracking();
    } else {
      stopDataUsageTracking();
    }

    if (isEnded) {
      const currentTime = ytPlayer.getCurrentTime?.() || 0;
      const duration = ytPlayer.getDuration?.() || 0;
      if (duration > 0 && currentTime / duration > 0.95) {
        dispatch(markVideoCompleted({ videoId }));
      }
    }
  }, [dispatch, startDataUsageTracking, stopDataUsageTracking, updatePlaybackState, videoId]);

  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const currentTime = player.getCurrentTime?.() || 0;
      const duration = player.getDuration?.() || 0;
      const buffered = (player.getVideoLoadedFraction?.() || 0) * duration;

      updatePlaybackState((prev) => {
        if (prev.playing && duration > 0 && currentTime > 5) {
          dispatch(updateVideoProgress({
            videoId,
            currentTime,
            duration
          }));
        }

        return {
          ...prev,
          currentTime,
          duration,
          buffered,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [player, dispatch, updatePlaybackState, videoId]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      stopDataUsageTracking();
    };
  }, [stopDataUsageTracking]);

  useEffect(() => {
    if (!player) return;

    const handleVisibilityChange = () => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) return;

      if (document.hidden) {
        if (!settings.enableBackgroundPlay && playerStateRef.current.playing) {
          currentPlayer.pauseVideo();
          backgroundPausedRef.current = true;
        }
        return;
      }

      if (backgroundPausedRef.current) {
        currentPlayer.playVideo();
        backgroundPausedRef.current = false;
        showNotice('已回到前景並恢復播放', 'success');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [player, settings.enableBackgroundPlay, showNotice]);

  useEffect(() => {
    if (!player || !('mediaSession' in navigator)) {
      return;
    }

    if (window.MediaMetadata) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title,
        artist: channelName,
        album: 'Youtuber no AD',
        artwork: [
          {
            src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            sizes: '480x360',
            type: 'image/jpeg',
          },
        ],
      });
    }

    const setHandler = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.debug(`Media Session action ${action} 不可用`, error);
      }
    };

    setHandler('play', () => playerRef.current?.playVideo?.());
    setHandler('pause', () => playerRef.current?.pauseVideo?.());
    setHandler('seekbackward', () => seekRelative(-10));
    setHandler('seekforward', () => seekRelative(10));
    setHandler('seekto', (details) => {
      if (!Number.isFinite(details?.seekTime)) return;
      playerRef.current?.seekTo?.(details.seekTime, true);
      syncCurrentTime(details.seekTime);
    });

    navigator.mediaSession.playbackState = playerState.playing ? 'playing' : 'paused';

    return () => {
      setHandler('play', null);
      setHandler('pause', null);
      setHandler('seekbackward', null);
      setHandler('seekforward', null);
      setHandler('seekto', null);
    };
  }, [channelName, player, playerState.playing, seekRelative, syncCurrentTime, title, videoId]);

  const handleMouseMove = () => {
    if (isTouchDevice) return;
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (ENABLE_CONTROL_AUTO_HIDE) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (playerStateRef.current.playing) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  const togglePlay = () => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    if (playerStateRef.current.playing) {
      currentPlayer.pauseVideo();
    } else {
      currentPlayer.playVideo();
    }
  };

  const handleVolumeChange = (_, newValue) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    currentPlayer.setVolume(newValue);
    updatePlaybackState((prev) => ({
      ...prev,
      volume: newValue,
      muted: newValue === 0,
    }));
  };

  const toggleMute = () => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    if (playerStateRef.current.muted) {
      currentPlayer.unMute();
      currentPlayer.setVolume(playerStateRef.current.volume || 50);
      updatePlaybackState((prev) => ({ ...prev, muted: false }));
    } else {
      currentPlayer.mute();
      updatePlaybackState((prev) => ({ ...prev, muted: true }));
    }
  };

  const setPlaybackRate = (rate) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    currentPlayer.setPlaybackRate(rate);
    updatePlaybackState((prev) => ({ ...prev, playbackRate: rate }));
  };

  const toggleFullscreen = () => {
    updatePlaybackState((prev) => {
      const newFullscreenState = !prev.fullscreen;

      try {
        const el = containerRef.current;
        if (newFullscreenState && el) {
          if (el.requestFullscreen) {
            el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
          } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
          }
        } else if (!newFullscreenState) {
          if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
          }
        }
      } catch (error) {
        console.log('Fullscreen API error:', error);
      }

      document.body.style.overflow = newFullscreenState ? 'hidden' : '';
      return { ...prev, fullscreen: newFullscreenState };
    });
  };

  const toggleSubtitles = () => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    const newSubtitlesState = !playerStateRef.current.subtitlesEnabled;
    updatePlaybackState((prev) => ({ ...prev, subtitlesEnabled: newSubtitlesState }));

    try {
      if (newSubtitlesState) {
        const language = settings.defaultSubtitleLanguage === 'auto' ? 'zh-TW' : settings.defaultSubtitleLanguage;
        if (language !== 'none') {
          currentPlayer.setOption('captions', 'reload', true);
          currentPlayer.setOption('captions', 'displaySettings', { background: 'black' });
        }
      } else {
        currentPlayer.unloadModule('captions');
      }
    } catch (error) {
      console.log('字幕控制錯誤:', error);
    }
  };

  const handleSeek = (_, newValue) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    currentPlayer.seekTo(newValue, true);
    syncCurrentTime(newValue);
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad2 = (n) => (n < 10 ? '0' : '') + n;
    return `${hrs}:${pad2(mins)}:${pad2(secs)}`;
  };

  const handleDoubleClick = (side) => {
    if (side === 'left') {
      seekRelative(-10);
    } else if (side === 'right') {
      seekRelative(10);
    }
  };

  const handleTogglePictureInPicture = async () => {
    if (!settings.enablePictureInPicture) {
      showNotice('請先在設定頁啟用畫中畫功能', 'warning');
      return;
    }

    if (!isPipSupported) {
      if (isTouchDevice) {
        showNotice('手機端請使用 YouTube 原生控制列或瀏覽器選單進入小窗', 'info');
      } else {
        showNotice('此瀏覽器不支援目前的畫中畫模式', 'warning');
      }
      return;
    }

    const result = await togglePictureInPicture({
      title,
      autoplay: playerStateRef.current.playing,
    });

    if (!result?.ok) {
      showNotice('無法切換畫中畫模式，請改用瀏覽器原生控制', 'warning');
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        paddingTop: playerState.fullscreen ? '0' : '56.25%',
        height: playerState.fullscreen ? '100vh' : '0',
        width: playerState.fullscreen ? '100vw' : '100%',
        bgcolor: '#000',
        overflow: 'hidden',
        ...(playerState.fullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
        }),
      }}
      onMouseMove={handleMouseMove}
    >
      {!isTouchDevice && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '30%',
              height: '100%',
              zIndex: 1,
            }}
            onDoubleClick={() => handleDoubleClick('left')}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '30%',
              height: '100%',
              zIndex: 1,
            }}
            onDoubleClick={() => handleDoubleClick('right')}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '30%',
              width: '40%',
              height: '100%',
              zIndex: 1,
            }}
            onClick={togglePlay}
          />
        </>
      )}

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          containerClassName={`youtube-container ${playerState.fullscreen ? 'fullscreen' : ''}`}
          className="youtube-player"
          iframeClassName="youtube-iframe"
          style={playerStyle}
        />
      </Box>

      {playbackNotice && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: playerState.fullscreen ? 100001 : 3,
          }}
        >
          <Alert severity={playbackNotice.severity} sx={{ py: 0.5 }}>
            {playbackNotice.message}
          </Alert>
        </Box>
      )}

      {isTouchDevice && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            px: 1.5,
            py: 1,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
            zIndex: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: 'white' }}>
            手機端已改用 YouTube 原生控制列，較利於背景播放與小窗功能。
          </Typography>
        </Box>
      )}

      {!isTouchDevice && showControls && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            transition: 'opacity 0.3s',
            opacity: showControls ? 1 : 0,
            zIndex: playerState.fullscreen ? 100000 : 2,
            pointerEvents: 'auto',
          }}
        >
          <Box sx={{ mb: 1, position: 'relative', height: '20px' }}>
            <Slider
              value={playerState.buffered}
              max={playerState.duration}
              disabled
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                '& .MuiSlider-track': { bgcolor: 'rgba(255,255,255,0.3)', height: '4px' },
                '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.1)', height: '4px' },
                '& .MuiSlider-thumb': { display: 'none' },
              }}
            />

            <Slider
              value={playerState.currentTime}
              max={playerState.duration}
              onChange={(_, newValue) => {
                syncCurrentTime(newValue);
                if (playerRef.current && Number.isFinite(newValue)) {
                  playerRef.current.seekTo(newValue, true);
                }
              }}
              onChangeCommitted={handleSeek}
              aria-label="播放進度"
              sx={{
                position: 'relative',
                height: '4px',
                '& .MuiSlider-track': { bgcolor: 'primary.main', height: '4px' },
                '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.2)', height: '4px' },
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  '&:hover': { width: 14, height: 14 },
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                {playerState.playing ? <FaPause /> : <FaPlay />}
              </IconButton>

              <IconButton onClick={() => seekRelative(-10)} sx={{ color: 'white' }}>
                <FaBackward />
              </IconButton>

              <IconButton onClick={() => seekRelative(10)} sx={{ color: 'white' }}>
                <FaForward />
              </IconButton>

              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                  {playerState.muted ? <FaVolumeMute /> : <FaVolumeUp />}
                </IconButton>
                <Slider
                  value={playerState.muted ? 0 : playerState.volume}
                  onChange={handleVolumeChange}
                  aria-label="音量"
                  sx={{
                    width: 80,
                    mx: 1,
                    '& .MuiSlider-track': { bgcolor: 'white' },
                    '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'white', mx: 1, whiteSpace: 'nowrap' }}>
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', mr: 1 }}>
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <Tooltip key={rate} title={`${rate}x 速度`}>
                    <Paper
                      onClick={() => setPlaybackRate(rate)}
                      sx={{
                        px: 1,
                        py: 0.5,
                        mx: 0.5,
                        cursor: 'pointer',
                        bgcolor: playerState.playbackRate === rate ? 'primary.main' : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: '0.75rem',
                      }}
                    >
                      {rate}x
                    </Paper>
                  </Tooltip>
                ))}
              </Box>

              <Tooltip title={playerState.subtitlesEnabled ? '關閉字幕' : '開啟字幕'}>
                <IconButton
                  onClick={toggleSubtitles}
                  sx={{
                    color: playerState.subtitlesEnabled ? 'primary.main' : 'white',
                    '&:hover': {
                      color: playerState.subtitlesEnabled ? 'primary.light' : 'grey.300'
                    }
                  }}
                >
                  <FaClosedCaptioning />
                </IconButton>
              </Tooltip>

              {settings.enablePictureInPicture && (
                <Tooltip title={isPipActive ? '關閉畫中畫' : supportMode === 'document' ? '開啟畫中畫' : '顯示畫中畫說明'}>
                  <IconButton
                    onClick={handleTogglePictureInPicture}
                    sx={{ color: isPipActive ? 'primary.main' : 'white' }}
                  >
                    <FaExternalLinkAlt />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title={playerState.fullscreen ? '退出全螢幕' : '全螢幕'}>
                <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                  {playerState.fullscreen ? <FaCompress /> : <FaExpand />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer;
