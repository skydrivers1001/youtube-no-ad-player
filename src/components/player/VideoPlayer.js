import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Box, Button, IconButton, Slider, Typography, Paper, Tooltip } from '@mui/material';
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
import {
  updateVideoProgress,
  selectVideoProgress,
  markVideoCompleted,
  clearVideoProgress,
} from '../../store/progressSlice';
import { recordDataUsage } from '../../store/statisticsSlice';

const NOTICE_AUTO_HIDE_MS = 3500;
const ESTIMATED_MB_PER_PLAYBACK_SECOND = 0.12;
const DATA_USAGE_BATCH_SECONDS = 15;
const TOUCH_INLINE_CONTROLS_HEIGHT = 148;

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
  const [resumePrompt, setResumePrompt] = useState(null);
  const [playerBrightness, setPlayerBrightness] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const controlsTimeoutRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const backgroundPausedRef = useRef(false);
  const touchGestureRef = useRef({
    leftLastTapAt: 0,
    rightLastTapAt: 0,
    activeSide: null,
    startX: 0,
    startY: 0,
    startValue: 0,
    moved: false,
    gestureType: null,
  });
  const backgroundTransitionRef = useRef({
    announced: false,
    usedBackgroundPlay: false,
    wasPlaying: false,
  });
  const lastPlaybackSampleRef = useRef(0);
  const pendingUsageSecondsRef = useRef(0);

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

  useEffect(() => {
    setResumePrompt(null);
    setPlayerBrightness(1);
    setIsSeeking(false);
    setSeekValue(0);
    lastPlaybackSampleRef.current = 0;
    pendingUsageSecondsRef.current = 0;
  }, [videoId]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(playerState.currentTime);
    }
  }, [isSeeking, playerState.currentTime]);

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
        autoplay: autoplay && !(savedProgress?.currentTime > 5) ? 1 : 0,
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
      savedProgress?.currentTime,
    settings.defaultSubtitleLanguage,
    settings.defaultSubtitlesEnabled,
  ]);

  const playerStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
  }), []);

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

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const normalizeSliderValue = (value) => (Array.isArray(value) ? value[0] : value);
  const flushPendingUsage = useCallback(() => {
    if (pendingUsageSecondsRef.current <= 0) {
      return;
    }

    dispatch(recordDataUsage(pendingUsageSecondsRef.current * ESTIMATED_MB_PER_PLAYBACK_SECOND));
    pendingUsageSecondsRef.current = 0;
  }, [dispatch]);

  const seekRelative = useCallback((seconds) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    const duration = playerStateRef.current.duration || currentPlayer.getDuration?.() || 0;
    const newTime = Math.max(0, Math.min(duration, (currentPlayer.getCurrentTime?.() || 0) + seconds));
    currentPlayer.seekTo(newTime, true);
    syncCurrentTime(newTime);
    lastPlaybackSampleRef.current = newTime;
  }, [syncCurrentTime]);

    const handleReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    playerRef.current = ytPlayer;
    ytPlayer.setPlaybackRate(playerStateRef.current.playbackRate);
    ytPlayer.setVolume(playerStateRef.current.volume);

    lastPlaybackSampleRef.current = ytPlayer.getCurrentTime?.() || 0;
    pendingUsageSecondsRef.current = 0;

    if (savedProgress && savedProgress.currentTime > 5) {
        setResumePrompt({
          currentTime: savedProgress.currentTime,
          duration: savedProgress.duration,
          shouldAutoplay: autoplay,
        });
    }

    if (onReady) {
      onReady(ytPlayer);
    }
  }, [autoplay, onReady, savedProgress]);

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

    if (!isPlaying) {
      flushPendingUsage();
      lastPlaybackSampleRef.current = ytPlayer.getCurrentTime?.() || 0;
    }

    if (isEnded) {
      const currentTime = ytPlayer.getCurrentTime?.() || 0;
      const duration = ytPlayer.getDuration?.() || 0;
      if (duration > 0 && currentTime / duration > 0.95) {
        dispatch(markVideoCompleted({ videoId }));
      }
    }
  }, [dispatch, flushPendingUsage, updatePlaybackState, videoId]);

  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const currentTime = player.getCurrentTime?.() || 0;
      const duration = player.getDuration?.() || 0;
      const buffered = (player.getVideoLoadedFraction?.() || 0) * duration;
      const previousSample = lastPlaybackSampleRef.current;
      const playbackDelta = currentTime - previousSample;
      const cappedPlaybackDelta = playbackDelta > 0 && playbackDelta <= 2.5 ? playbackDelta : 0;
      lastPlaybackSampleRef.current = currentTime;

      updatePlaybackState((prev) => {
        if (prev.playing && duration > 0 && currentTime > 5) {
          dispatch(updateVideoProgress({
            videoId,
            currentTime,
            duration
          }));

          pendingUsageSecondsRef.current += cappedPlaybackDelta;
          if (pendingUsageSecondsRef.current >= DATA_USAGE_BATCH_SECONDS) {
            const batchedSeconds = Math.floor(pendingUsageSecondsRef.current / DATA_USAGE_BATCH_SECONDS) * DATA_USAGE_BATCH_SECONDS;
            pendingUsageSecondsRef.current -= batchedSeconds;
            dispatch(recordDataUsage(batchedSeconds * ESTIMATED_MB_PER_PLAYBACK_SECOND));
          }
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
      flushPendingUsage();
    };
  }, [flushPendingUsage]);

  useEffect(() => {
    if (!player) return;

    const handleWindowBlur = () => {
      if (!settings.enableBackgroundPlay || isPipActive) return;
      if (!playerStateRef.current.playing || document.hidden) return;
      if (backgroundTransitionRef.current.announced) return;

      backgroundTransitionRef.current.announced = true;
      showNotice('即將切到背景，若瀏覽器支援會持續播放', 'info');
    };

    const handleVisibilityChange = () => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) return;

      if (document.hidden) {
        backgroundTransitionRef.current.wasPlaying = playerStateRef.current.playing;
        backgroundTransitionRef.current.usedBackgroundPlay =
          settings.enableBackgroundPlay && playerStateRef.current.playing && !isPipActive;

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
      } else if (
        backgroundTransitionRef.current.usedBackgroundPlay &&
        backgroundTransitionRef.current.wasPlaying
      ) {
        showNotice('背景播放已恢復', 'success');
      }

      backgroundTransitionRef.current = {
        announced: false,
        usedBackgroundPlay: false,
        wasPlaying: false,
      };
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPipActive, player, settings.enableBackgroundPlay, showNotice]);

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
      lastPlaybackSampleRef.current = details.seekTime;
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

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const inFullscreen = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement
    );

    try {
      if (!inFullscreen) {
        if (!el) return;

        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        } else {
          showNotice('此裝置不支援網頁全螢幕', 'warning');
          return;
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen API error:', error);
      showNotice('無法切換全螢幕，請改用瀏覽器原生控制', 'warning');
    }
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

  const handleSeekPreview = (_, newValue) => {
    const nextValue = normalizeSliderValue(newValue);
    if (!Number.isFinite(nextValue)) return;

    setIsSeeking(true);
    setSeekValue(nextValue);
  };

  const handleSeek = (_, newValue) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    const nextValue = normalizeSliderValue(newValue);
    if (!Number.isFinite(nextValue)) return;

    currentPlayer.seekTo(nextValue, true);
    syncCurrentTime(nextValue);
    setSeekValue(nextValue);
    setIsSeeking(false);
    lastPlaybackSampleRef.current = nextValue;
  };

  const displayCurrentTime = isSeeking ? seekValue : playerState.currentTime;
    const hasInlineTouchControls = isTouchDevice && !playerState.fullscreen;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad2 = (n) => (n < 10 ? '0' : '') + n;
    return `${hrs}:${pad2(mins)}:${pad2(secs)}`;
  };

  const handleResumeChoice = (shouldResume) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer || !resumePrompt) {
      return;
    }

    const targetTime = shouldResume ? resumePrompt.currentTime : 0;
    currentPlayer.seekTo(targetTime, true);
    syncCurrentTime(targetTime);
    lastPlaybackSampleRef.current = targetTime;

    if (!shouldResume) {
      dispatch(clearVideoProgress({ videoId }));
    }

    if (resumePrompt.shouldAutoplay) {
      currentPlayer.playVideo();
    }

    setResumePrompt(null);
    showNotice(shouldResume ? `從 ${formatTime(targetTime)} 繼續播放` : '已從頭開始播放', 'success');
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

  const handleTouchGestureStart = (side, event) => {
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    touchGestureRef.current = {
      ...touchGestureRef.current,
      activeSide: side,
      startX: touch.clientX,
      startY: touch.clientY,
      startValue: side === 'right' ? playerStateRef.current.volume : playerBrightness,
      moved: false,
      gestureType: null,
    };
  };

  const handleTouchGestureMove = (side, event) => {
    const currentPlayer = playerRef.current;
    const touch = event.touches?.[0];
    if (!currentPlayer || !touch || touchGestureRef.current.activeSide !== side) {
      return;
    }

    const deltaY = touch.clientY - touchGestureRef.current.startY;
    const deltaX = touch.clientX - touchGestureRef.current.startX;
    if (Math.abs(deltaY) < 12 || Math.abs(deltaY) < Math.abs(deltaX)) {
      return;
    }

    touchGestureRef.current.moved = true;
    touchGestureRef.current.gestureType = side === 'right' ? 'volume' : 'brightness';
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight || 1;
    const ratio = -deltaY / containerHeight;

    if (side === 'right') {
      const nextVolume = clamp(Math.round(touchGestureRef.current.startValue + ratio * 120), 0, 100);
      currentPlayer.setVolume(nextVolume);
      if (nextVolume === 0) {
        currentPlayer.mute();
      } else {
        currentPlayer.unMute();
      }
      updatePlaybackState((prev) => ({
        ...prev,
        volume: nextVolume,
        muted: nextVolume === 0,
      }));
    } else {
      setPlayerBrightness(clamp(Number((touchGestureRef.current.startValue + ratio * 1.2).toFixed(2)), 0.45, 1.25));
    }
  };

  const handleTouchGestureEnd = (side) => {
    const gesture = touchGestureRef.current;
    if (gesture.activeSide !== side) {
      return;
    }

    if (gesture.moved) {
      if (gesture.gestureType === 'volume') {
        showNotice(`音量 ${Math.round(playerStateRef.current.muted ? 0 : playerStateRef.current.volume)}%`, 'info');
      } else if (gesture.gestureType === 'brightness') {
        showNotice(`亮度 ${Math.round(playerBrightness * 100)}%`, 'info');
      }
    } else {
      const now = Date.now();
      const tapKey = side === 'left' ? 'leftLastTapAt' : 'rightLastTapAt';
      if (now - gesture[tapKey] < 280) {
        seekRelative(side === 'left' ? -10 : 10);
        showNotice(side === 'left' ? '快退 10 秒' : '快進 10 秒', 'info');
        touchGestureRef.current[tapKey] = 0;
      } else {
        touchGestureRef.current[tapKey] = now;
      }
    }

    touchGestureRef.current = {
      ...touchGestureRef.current,
      activeSide: null,
      moved: false,
      gestureType: null,
    };
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
            paddingTop: playerState.fullscreen
              ? '0'
              : hasInlineTouchControls
                ? `calc(56.25% + ${TOUCH_INLINE_CONTROLS_HEIGHT}px)`
                : '56.25%',
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
            right: 0,
            bottom: hasInlineTouchControls ? `${TOUCH_INLINE_CONTROLS_HEIGHT}px` : 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
            filter: `brightness(${playerBrightness})`,
            transition: 'filter 0.2s ease',
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

        {resumePrompt && (
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              right: 12,
                bottom: isTouchDevice
                    ? (playerState.fullscreen
                      ? 'calc(108px + env(safe-area-inset-bottom))'
                      : TOUCH_INLINE_CONTROLS_HEIGHT + 12)
                  : 24,
              zIndex: playerState.fullscreen ? 100001 : 4,
            }}
          >
            <Alert
              severity="info"
              action={(
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button color="inherit" size="small" onClick={() => handleResumeChoice(false)}>
                    從頭播放
                  </Button>
                  <Button color="inherit" size="small" variant="outlined" onClick={() => handleResumeChoice(true)}>
                    從 {formatTime(resumePrompt.currentTime)} 繼續
                  </Button>
                </Box>
              )}
              sx={{ alignItems: 'center' }}
            >
              上次看到 {formatTime(resumePrompt.currentTime)}，要從那裡繼續嗎？
            </Alert>
          </Box>
        )}

          {isTouchDevice && settings.enableTouchGestures && (
          <>
            <Box
              sx={{
                position: 'absolute',
                  top: '22%',
                  left: '10%',
                  width: '12%',
                  height: '36%',
                  zIndex: 2,
                touchAction: 'none',
              }}
              onTouchStart={(event) => handleTouchGestureStart('left', event)}
              onTouchMove={(event) => handleTouchGestureMove('left', event)}
              onTouchEnd={() => handleTouchGestureEnd('left')}
            />

            <Box
              sx={{
                position: 'absolute',
                  top: '22%',
                  right: '10%',
                  width: '12%',
                  height: '36%',
                  zIndex: 2,
                touchAction: 'none',
              }}
              onTouchStart={(event) => handleTouchGestureStart('right', event)}
              onTouchMove={(event) => handleTouchGestureMove('right', event)}
              onTouchEnd={() => handleTouchGestureEnd('right')}
            />
          </>
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
              value={displayCurrentTime}
              max={playerState.duration}
              onChange={handleSeekPreview}
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
                {formatTime(displayCurrentTime)} / {formatTime(playerState.duration)}
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
        {isTouchDevice && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              px: 1.5,
              pt: 1.25,
              pb: 'calc(10px + env(safe-area-inset-bottom))',
                minHeight: `${TOUCH_INLINE_CONTROLS_HEIGHT}px`,
                background: hasInlineTouchControls
                  ? 'linear-gradient(180deg, rgba(8,12,24,0.94) 0%, rgba(12,18,32,0.98) 100%)'
                  : 'linear-gradient(transparent, rgba(17,24,39,0.9) 24%, rgba(17,24,39,0.98))',
              color: 'white',
              zIndex: playerState.fullscreen ? 100000 : 3,
                backdropFilter: 'blur(6px)',
                borderTop: hasInlineTouchControls ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}
          >
            <Box sx={{ px: 0.5 }}>
              <Slider
                value={displayCurrentTime}
                max={playerState.duration || 0}
                onChange={handleSeekPreview}
                onChangeCommitted={handleSeek}
                aria-label="手機播放進度"
                sx={{
                  mb: 0.5,
                  '& .MuiSlider-track': { bgcolor: 'primary.main' },
                  '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.2)' },
                  '& .MuiSlider-thumb': { width: 14, height: 14 },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                {formatTime(displayCurrentTime)} / {formatTime(playerState.duration)}
              </Typography>
              <Button size="small" onClick={toggleFullscreen} sx={{ minWidth: 'auto', color: 'white' }}>
                {playerState.fullscreen ? '退出全螢幕' : '全螢幕'}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton onClick={() => seekRelative(-10)} sx={{ color: 'white' }}>
                  <FaBackward />
                </IconButton>
                <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                  {playerState.playing ? <FaPause /> : <FaPlay />}
                </IconButton>
                <IconButton onClick={() => seekRelative(10)} sx={{ color: 'white' }}>
                  <FaForward />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0.75 }}>
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <Paper
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    sx={{
                      px: 1,
                      py: 0.5,
                      cursor: 'pointer',
                      bgcolor: playerState.playbackRate === rate ? 'primary.main' : 'rgba(255,255,255,0.08)',
                      color: 'white',
                      fontSize: '0.75rem',
                      borderRadius: 1.5,
                    }}
                  >
                    {rate}x
                  </Paper>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default VideoPlayer;
