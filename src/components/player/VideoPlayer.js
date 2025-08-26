import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, IconButton, Slider, Typography, Grid, Paper, Tooltip } from '@mui/material';
import { 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaCompress, 
  FaVolumeUp, 
  FaVolumeMute,
  FaForward,
  FaBackward,
  FaExternalLinkAlt
} from 'react-icons/fa';
import YouTube from 'react-youtube';
import usePictureInPicture from '../../hooks/usePictureInPicture';
import { updateVideoProgress, selectVideoProgress, markVideoCompleted } from '../../store/progressSlice';
import { recordDataUsage } from '../../store/statisticsSlice';

const VideoPlayer = ({ videoId, onReady, autoplay = true }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const savedProgress = useSelector((state) => selectVideoProgress(state, videoId));
  
  const [player, setPlayer] = useState(null);
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
  });
  
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  
  const ENABLE_CONTROL_AUTO_HIDE = false;
  
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);
  
  const [dataUsageTracker, setDataUsageTracker] = useState({
    lastRecordedTime: 0,
    totalWatchTime: 0,
    estimatedDataUsage: 0
  });
  const dataUsageIntervalRef = useRef(null);
  
  const { 
    videoRef, 
    isPipSupported, 
    isPipActive, 
    togglePictureInPicture 
  } = usePictureInPicture({ 
    enabled: settings.pictureInPictureEnabled 
  });
  
  const opts = useMemo(() => ({
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      cc_load_policy: settings.defaultSubtitlesEnabled ? 1 : 0,
      hl: settings.defaultSubtitlesLanguage || 'zh-TW',
    },
  }), [autoplay, settings]);

  const playerStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
  }), []);

  const startDataUsageTracking = useCallback(() => {
    if (dataUsageIntervalRef.current) return;
    const startTime = Date.now();
    setDataUsageTracker(prev => ({ ...prev, lastRecordedTime: startTime }));
    // 暫時註解掉數據使用追蹤的 setInterval 以解決頁面閃爍問題
    // dataUsageIntervalRef.current = setInterval(() => {
    //     const currentTime = Date.now();
    //     const timeDiff = (currentTime - dataUsageTracker.lastRecordedTime) / 1000;

    //     if (timeDiff > 0) {
    //         const estimatedUsageMB = (timeDiff / 60) * 3;
    //         setDataUsageTracker(prev => {
    //             const newEstimatedUsage = prev.estimatedDataUsage + estimatedUsageMB;
    //             if (newEstimatedUsage >= 30) {
    //                 dispatch(recordDataUsage(newEstimatedUsage));
    //                 return {
    //                     ...prev,
    //                     lastRecordedTime: currentTime,
    //                     totalWatchTime: prev.totalWatchTime + timeDiff,
    //                     estimatedDataUsage: 0
    //                 };
    //             }
    //             return {
    //                 ...prev,
    //                 lastRecordedTime: currentTime,
    //                 totalWatchTime: prev.totalWatchTime + timeDiff,
    //                 estimatedDataUsage: newEstimatedUsage
    //             };
    //         });
    //     }
    // }, 5000);
  }, [dispatch, dataUsageTracker.lastRecordedTime]);

  const stopDataUsageTracking = useCallback(() => {
    if (dataUsageIntervalRef.current) {
      clearInterval(dataUsageIntervalRef.current);
      dataUsageIntervalRef.current = null;
      if (dataUsageTracker.estimatedDataUsage > 0) {
        dispatch(recordDataUsage(dataUsageTracker.estimatedDataUsage));
        setDataUsageTracker(prev => ({ ...prev, estimatedDataUsage: 0 }));
      }
    }
  }, [dispatch, dataUsageTracker.estimatedDataUsage]);

  const handleReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    ytPlayer.setPlaybackRate(playerState.playbackRate);
    ytPlayer.setVolume(playerState.volume);

    if (videoId) {
      dispatch(recordDataUsage(5));
    }

    if (savedProgress && savedProgress.currentTime > 5) {
      ytPlayer.seekTo(savedProgress.currentTime, true);
    }

    if (onReady) {
      onReady(ytPlayer);
    }
  }, [dispatch, onReady, playerState.playbackRate, playerState.volume, savedProgress, videoId]);

  const handleStateChange = useCallback((event) => {
    const isPlaying = event.data === 1;
    const isEnded = event.data === 0;

    setPlayerState(prev => ({
      ...prev,
      playing: isPlaying,
      duration: player ? player.getDuration() : 0,
    }));

    if (isPlaying) {
      startDataUsageTracking();
    } else {
      stopDataUsageTracking();
    }

    if (isEnded && player) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      if (currentTime / duration > 0.95) {
        dispatch(markVideoCompleted({ videoId }));
      }
    }
  }, [player, dispatch, videoId, startDataUsageTracking, stopDataUsageTracking]);

  useEffect(() => {
    if (!player) return;
    
    // 暫時註解掉頻繁的進度更新以解決頁面閃爍問題
    const interval = setInterval(() => {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const buffered = player.getVideoLoadedFraction() * duration;
      
      setPlayerState(prev => {
        // 註解掉頻繁的 Redux 更新
        // if (prev.playing && duration > 0 && currentTime > 5) {
        //   dispatch(updateVideoProgress({
        //     videoId,
        //     currentTime,
        //     duration
        //   }));
        // }
        
        return {
          ...prev,
          currentTime,
          duration,
          buffered,
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [player, dispatch, videoId]);
  
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      stopDataUsageTracking();
      if (player && playerState.duration > 0 && playerState.currentTime > 5) {
        dispatch(updateVideoProgress({
          videoId,
          currentTime: playerState.currentTime,
          duration: playerState.duration
        }));
      }
    };
  }, [player, playerState, videoId, dispatch, stopDataUsageTracking]);
  
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (ENABLE_CONTROL_AUTO_HIDE) {
      const hideDelay = isTouchDevice ? 5000 : 3000;
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (playerState.playing) {
          setShowControls(false);
        }
      }, hideDelay);
    }
  };
  
  const handleTouchInteraction = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (ENABLE_CONTROL_AUTO_HIDE) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (playerState.playing) {
          setShowControls(false);
        }
      }, 5000);
    }
  };
  
  const togglePlay = () => {
    if (!player) return;
    
    if (playerState.playing) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };
  
  const handleVolumeChange = (event, newValue) => {
    player.setVolume(newValue);
    setPlayerState(prev => ({
      ...prev,
      volume: newValue,
      muted: newValue === 0,
    }));
  };
  
  const toggleMute = () => {
    if (playerState.muted) {
      player.unMute();
      player.setVolume(playerState.volume || 50);
      setPlayerState(prev => ({ ...prev, muted: false }));
    } else {
      player.mute();
      setPlayerState(prev => ({ ...prev, muted: true }));
    }
  };
  
  const setPlaybackRate = (rate) => {
    player.setPlaybackRate(rate);
    setPlayerState(prev => ({ ...prev, playbackRate: rate }));
  };
  
  const toggleFullscreen = () => {
    setPlayerState(prev => {
      const newFullscreenState = !prev.fullscreen;
      
      if (newFullscreenState) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      
      return { ...prev, fullscreen: newFullscreenState };
    });
  };
  
  const toggleFocusMode = () => {
    setPlayerState(prev => ({ ...prev, focusMode: !prev.focusMode }));
  };
  
  const handleSeek = (event, newValue) => {
    player.seekTo(newValue);
    setPlayerState(prev => ({ ...prev, currentTime: newValue }));
  };
  
  const seekRelative = (seconds) => {
    const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds));
    player.seekTo(newTime);
    setPlayerState(prev => ({ ...prev, currentTime: newTime }));
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const handleDoubleClick = (side) => {
    if (side === 'left') {
      seekRelative(-10);
    } else if (side === 'right') {
      seekRelative(10);
    }
  };
  
  return (
    <Box 
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
      onTouchStart={handleTouchInteraction}
      onTouchMove={handleTouchInteraction}
    >
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
        onTouchEnd={togglePlay}
      />
      
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
      
      {showControls && (
        <Box 
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            transition: 'opacity 0.3s',
            opacity: showControls ? 1 : 0,
            zIndex: playerState.fullscreen ? 10000 : 2,
            pointerEvents: 'auto',
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Box sx={{ mb: 1, position: 'relative' }}>
            <Slider
              value={playerState.buffered}
              max={playerState.duration}
              disabled
              sx={{
                position: 'absolute',
                top: 0,
                '& .MuiSlider-track': { bgcolor: 'rgba(255,255,255,0.3)' },
                '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.1)' },
                '& .MuiSlider-thumb': { display: 'none' },
              }}
            />
            
            <Slider
              value={playerState.currentTime}
              max={playerState.duration}
              onChange={handleSeek}
              aria-label="播放進度"
              sx={{
                '& .MuiSlider-track': { bgcolor: 'primary.main' },
                '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.2)' },
                '& .MuiSlider-thumb': { width: 12, height: 12, '&:hover': { width: 14, height: 14 } },
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              
              <Typography variant="body2" sx={{ color: 'white', mx: 1 }}>
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', mr: 1 }}>
                {[0.5, 1, 1.5, 2].map(rate => (
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
              
              {isPipSupported && settings.pictureInPictureEnabled && (
                <Tooltip title="畫中畫模式">
                  <IconButton onClick={togglePictureInPicture} sx={{ color: 'white' }}>
                    <FaExternalLinkAlt />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title={playerState.fullscreen ? "退出全螢幕" : "全螢幕"}>
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