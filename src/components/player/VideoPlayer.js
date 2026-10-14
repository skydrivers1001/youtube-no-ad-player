import { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Box, Button, IconButton, Slider, Typography, Tooltip, Menu, MenuItem } from '@mui/material';
import {
  FaPlay,
  FaPause,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaForward,
  FaBackward,
  FaStepForward,
  FaStepBackward,
  FaExternalLinkAlt,
  FaClosedCaptioning,
  FaRedo
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
const TOUCH_INLINE_CONTROLS_HEIGHT = 68;
export const AVAILABLE_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const VideoPlayer = forwardRef(({
  videoId,
  title = '影片',
  channelName = '頻道',
  onReady,
  autoplay = true,
  playlistId = null,
  playlistVideos = [],
  initialVideoIndex = 0,
  playlistLabel = '',
  onVideoChange = null,
  onPlaylistDetected = null,
  loopEnabled: externalLoopEnabled,
  onLoopChange = null,
}, ref) => {
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
  const [loopEnabled, setLoopEnabled] = useState(Boolean(externalLoopEnabled));
  const loopEnabledRef = useRef(Boolean(externalLoopEnabled));
  const currentVideoIndexRef = useRef(initialVideoIndex);
  const initialVideoIdRef = useRef(videoId);
  const lastLoadedVideoIdRef = useRef(videoId);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState(null);
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
  const initialAutoplayRef = useRef({
    videoId,
    enabled: autoplay && !(savedProgress?.currentTime > 5),
  });
  if (initialAutoplayRef.current.videoId !== videoId) {
    initialAutoplayRef.current = {
      videoId,
      enabled: autoplay && !(savedProgress?.currentTime > 5),
    };
  }

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
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

  useEffect(() => {
    if (externalLoopEnabled !== undefined) {
      setLoopEnabled(externalLoopEnabled);
      loopEnabledRef.current = externalLoopEnabled;
    }
  }, [externalLoopEnabled]);

  useEffect(() => {
    setPlayerBrightness(1);
    setIsSeeking(false);
    setSeekValue(0);
    lastPlaybackSampleRef.current = 0;
    pendingUsageSecondsRef.current = 0;
    setLoopEnabled(false);
    loopEnabledRef.current = false;
  }, [videoId]);

  useEffect(() => {
    currentVideoIndexRef.current = initialVideoIndex;
  }, [initialVideoIndex]);

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

  const getPipCurrentTime = useCallback(() => playerRef.current?.getCurrentTime?.() || 0, []);
  const getShouldResumePipPlayback = useCallback(() => !document.hidden, []);
  const handlePipEnter = useCallback(({ wasPlaying }) => {
    if (wasPlaying) {
      playerRef.current?.pauseVideo?.();
    }
    showNotice('已切換到小窗播放', 'info');
  }, [showNotice]);
  const handlePipExit = useCallback(({ estimatedCurrentTime, resumePlaybackInSource }) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    currentPlayer.seekTo(estimatedCurrentTime, true);
    if (!playerStateRef.current.muted && playerStateRef.current.volume > 0) {
      currentPlayer.setVolume(playerStateRef.current.volume);
      currentPlayer.unMute();
    }
    if (resumePlaybackInSource) {
      currentPlayer.playVideo();
    }
    showNotice('已回到頁面播放器', 'success');
  }, [showNotice]);

  const {
    isPipSupported,
    isPipActive,
    togglePictureInPicture
  } = usePictureInPicture({
    enabled: settings.enablePictureInPicture,
    buildEmbedUrl,
    getCurrentTime: getPipCurrentTime,
    getShouldResumePlayback: getShouldResumePipPlayback,
    onEnter: handlePipEnter,
    onExit: handlePipExit,
  });

  const opts = useMemo(() => {
    const subtitleLang = settings.defaultSubtitleLanguage === 'auto' ? 'zh-TW' : settings.defaultSubtitleLanguage;
    const isCcEnabled = settings.defaultSubtitlesEnabled !== false && subtitleLang !== 'none';

    return {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 1,
        controls: isTouchDevice ? 1 : 0,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        cc_load_policy: isCcEnabled ? 1 : 0,
        ...(isCcEnabled && subtitleLang ? { cc_lang_pref: subtitleLang } : {}),
        hl: subtitleLang !== 'none' ? subtitleLang : 'zh-TW',
        playsinline: 1,
        ...(playlistId ? { listType: 'playlist', list: playlistId } : {}),
      },
    };
  }, [
    isTouchDevice,
    playlistId,
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

  const applySubtitles = useCallback((enabled, lang) => {
    const yt = playerRef.current;
    if (!yt) return;
    try {
      const targetLang = (!lang || lang === 'auto') ? 'zh-TW' : lang;
      if (!enabled || targetLang === 'none') {
        if (typeof yt.unloadModule === 'function') {
          yt.unloadModule('captions');
        }
        if (typeof yt.setOption === 'function') {
          yt.setOption('captions', 'track', {});
        }
      } else {
        if (typeof yt.loadModule === 'function') {
          yt.loadModule('captions');
        }
        if (typeof yt.setOption === 'function') {
          yt.setOption('captions', 'reload', true);
          yt.setOption('captions', 'track', { languageCode: targetLang });
          yt.setOption('captions', 'displaySettings', { background: 'black' });
        }
      }
    } catch (err) {
      console.warn('字幕控制錯誤:', err);
    }
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

  const syncPlaylistFromPlayer = useCallback((ytPlayer) => {
    if (!ytPlayer || !onPlaylistDetected) return;
    try {
      const playlistIds = ytPlayer.getPlaylist?.();
      if (Array.isArray(playlistIds) && playlistIds.length > 1) {
        onPlaylistDetected(playlistIds);
      }
    } catch (e) {
      console.debug('syncPlaylistFromPlayer error', e);
    }
  }, [onPlaylistDetected]);

  const playNextVideo = useCallback(() => {
    const ytPlayer = playerRef.current;
    if (!ytPlayer) return;

    // 1. 若播放器內部有原生 YouTube 清單且有至少 2 支影片
    const playlistIds = ytPlayer.getPlaylist?.();
    const playlistIdx = ytPlayer.getPlaylistIndex?.();
    if (Array.isArray(playlistIds) && playlistIds.length > 1 && typeof playlistIdx === 'number' && playlistIdx >= 0) {
      const nextIdx = (playlistIdx + 1) % playlistIds.length;
      const nextId = playlistIds[nextIdx];
      lastLoadedVideoIdRef.current = nextId;
      currentVideoIndexRef.current = nextIdx;
      dispatch(clearVideoProgress({ videoId }));
      if (playlistLabel) {
        showNotice(`播放清單 (${nextIdx + 1}/${playlistIds.length})`, 'info');
      }
      try {
        ytPlayer.playVideoAt(nextIdx);
      } catch (e) {
        console.debug('ytPlayer.playVideoAt error', e);
        try {
          ytPlayer.nextVideo();
        } catch (e2) {
          console.debug('ytPlayer.nextVideo error', e2);
        }
      }
      const matchedVideo = playlistVideos.find((v) => v.id === nextId) || { id: nextId };
      if (onVideoChange) {
        onVideoChange(matchedVideo, nextIdx);
      }
      return;
    }

    // 2. 透過 playlistVideos 切換（由當前影片 ID 動態定位）
    if (playlistVideos.length > 0) {
      const currentActualId = ytPlayer.getVideoData?.()?.video_id || videoId;
      let currentIndex = playlistVideos.findIndex((v) => v.id === currentActualId);
      if (currentIndex === -1) {
        currentIndex = currentVideoIndexRef.current;
      }

      const nextIndex = (currentIndex + 1) % playlistVideos.length;
      const nextVideo = playlistVideos[nextIndex];
      if (nextVideo?.id) {
        currentVideoIndexRef.current = nextIndex;
        lastLoadedVideoIdRef.current = nextVideo.id;
        dispatch(clearVideoProgress({ videoId }));
        if (playlistLabel) {
          showNotice(`播放清單 (${nextIndex + 1}/${playlistVideos.length})`, 'info');
        }

        const currentPlaylist = ytPlayer.getPlaylist?.();
        if (Array.isArray(currentPlaylist) && currentPlaylist.includes(nextVideo.id)) {
          try {
            ytPlayer.playVideoAt(currentPlaylist.indexOf(nextVideo.id));
          } catch (e) {
            console.debug('playVideoAt error', e);
          }
        } else {
          try {
            ytPlayer.loadVideoById(nextVideo.id);
            ytPlayer.playVideo();
          } catch (e) {
            console.debug('loadVideoById failed', e);
          }
        }

        if (onVideoChange) {
          onVideoChange(nextVideo, nextIndex);
        }
        return;
      }
    }

    // 3. Fallback: 調用原生 nextVideo
    if (playlistId && typeof ytPlayer.nextVideo === 'function') {
      try {
        ytPlayer.nextVideo();
      } catch (e) {
        console.debug('ytPlayer.nextVideo fallback error', e);
      }
    }
  }, [playlistVideos, videoId, playlistLabel, showNotice, dispatch, onVideoChange, playlistId]);

  const playPreviousVideo = useCallback(() => {
    const ytPlayer = playerRef.current;
    if (!ytPlayer) return;

    // 1. 若播放器內部有原生 YouTube 清單且有上一首
    const playlistIds = ytPlayer.getPlaylist?.();
    const playlistIdx = ytPlayer.getPlaylistIndex?.();
    if (Array.isArray(playlistIds) && playlistIds.length > 1 && typeof playlistIdx === 'number' && playlistIdx >= 0) {
      const prevIdx = (playlistIdx - 1 + playlistIds.length) % playlistIds.length;
      const prevId = playlistIds[prevIdx];
      lastLoadedVideoIdRef.current = prevId;
      currentVideoIndexRef.current = prevIdx;
      dispatch(clearVideoProgress({ videoId }));
      if (playlistLabel) {
        showNotice(`播放清單 (${prevIdx + 1}/${playlistIds.length})`, 'info');
      }
      try {
        ytPlayer.playVideoAt(prevIdx);
      } catch (e) {
        console.debug('ytPlayer.playVideoAt error', e);
        try {
          ytPlayer.previousVideo();
        } catch (e2) {
          console.debug('ytPlayer.previousVideo error', e2);
        }
      }
      const matchedVideo = playlistVideos.find((v) => v.id === prevId) || { id: prevId };
      if (onVideoChange) {
        onVideoChange(matchedVideo, prevIdx);
      }
      return;
    }

    // 2. 透過 playlistVideos 切換
    if (playlistVideos.length > 0) {
      const currentActualId = ytPlayer.getVideoData?.()?.video_id || videoId;
      let currentIndex = playlistVideos.findIndex((v) => v.id === currentActualId);
      if (currentIndex === -1) {
        currentIndex = currentVideoIndexRef.current;
      }

      const prevIndex = (currentIndex - 1 + playlistVideos.length) % playlistVideos.length;
      const prevVideo = playlistVideos[prevIndex];
      if (prevVideo?.id) {
        currentVideoIndexRef.current = prevIndex;
        lastLoadedVideoIdRef.current = prevVideo.id;
        dispatch(clearVideoProgress({ videoId }));
        if (playlistLabel) {
          showNotice(`播放清單 (${prevIndex + 1}/${playlistVideos.length})`, 'info');
        }

        const currentPlaylist = ytPlayer.getPlaylist?.();
        if (Array.isArray(currentPlaylist) && currentPlaylist.includes(prevVideo.id)) {
          try {
            ytPlayer.playVideoAt(currentPlaylist.indexOf(prevVideo.id));
          } catch (e) {
            console.debug('playVideoAt error', e);
          }
        } else {
          try {
            ytPlayer.loadVideoById(prevVideo.id);
            ytPlayer.playVideo();
          } catch (e) {
            console.debug('loadVideoById failed', e);
          }
        }

        if (onVideoChange) {
          onVideoChange(prevVideo, prevIndex);
        }
        return;
      }
    }

    // 3. Fallback: 調用原生 previousVideo
    if (playlistId && typeof ytPlayer.previousVideo === 'function') {
      try {
        ytPlayer.previousVideo();
      } catch (e) {
        console.debug('ytPlayer.previousVideo fallback error', e);
      }
    }
  }, [playlistVideos, videoId, playlistLabel, showNotice, dispatch, onVideoChange, playlistId]);

  useEffect(() => {
    const isEnabled = settings.defaultSubtitlesEnabled !== false && settings.defaultSubtitleLanguage !== 'none';
    updatePlaybackState((prev) => ({
      ...prev,
      subtitlesEnabled: isEnabled,
    }));
    applySubtitles(isEnabled, settings.defaultSubtitleLanguage);
  }, [applySubtitles, settings.defaultSubtitleLanguage, settings.defaultSubtitlesEnabled, updatePlaybackState]);

  const handleReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    playerRef.current = ytPlayer;
    ytPlayer.setPlaybackRate(playerStateRef.current.playbackRate);
    ytPlayer.setVolume(playerStateRef.current.volume);
    if (playerStateRef.current.muted || playerStateRef.current.volume === 0) {
      ytPlayer.mute();
    } else {
      ytPlayer.unMute();
    }

    if (playerStateRef.current.subtitlesEnabled) {
      applySubtitles(true, settings.defaultSubtitleLanguage);
    }

    lastPlaybackSampleRef.current = ytPlayer.getCurrentTime?.() || 0;
    pendingUsageSecondsRef.current = 0;

    if (lastLoadedVideoIdRef.current && lastLoadedVideoIdRef.current !== initialVideoIdRef.current) {
      try {
        ytPlayer.loadVideoById(lastLoadedVideoIdRef.current);
      } catch (e) {
        console.debug('handleReady loadVideoById error', e);
      }
    }

    if (savedProgress && savedProgress.currentTime > 5) {
      setResumePrompt({
        currentTime: savedProgress.currentTime,
        duration: savedProgress.duration,
        shouldAutoplay: autoplay,
      });
    } else if (autoplay) {
      try {
        ytPlayer.playVideo();
      } catch (e) {
        console.debug('handleReady playVideo error', e);
      }
    }

    if (onReady) {
      onReady(ytPlayer);
    }
    syncPlaylistFromPlayer(ytPlayer);
  }, [applySubtitles, autoplay, onReady, savedProgress, settings.defaultSubtitleLanguage, syncPlaylistFromPlayer]);

  const handleStateChange = useCallback((event) => {
    const ytPlayer = event.target;
    const isPlaying = event.data === 1;
    const isEnded = event.data === 0;

    updatePlaybackState((prev) => ({
      ...prev,
      playing: isPlaying,
      duration: ytPlayer.getDuration?.() || 0,
    }));

    if (isPlaying && playerStateRef.current.subtitlesEnabled) {
      applySubtitles(true, settings.defaultSubtitleLanguage);
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    if (isPlaying && onVideoChange) {
      const videoData = ytPlayer.getVideoData?.();
      if (videoData?.video_id && videoId && videoData.video_id !== videoId) {
        lastLoadedVideoIdRef.current = videoData.video_id;
        if (playlistVideos.length > 0) {
          const idx = playlistVideos.findIndex((v) => v.id === videoData.video_id);
          if (idx !== -1) {
            currentVideoIndexRef.current = idx;
          }
        }
        onVideoChange({
          id: videoData.video_id,
          title: videoData.title || title,
          channel: videoData.author || channelName,
        });
      }
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
      if (loopEnabledRef.current) {
        ytPlayer.seekTo(0, true);
        ytPlayer.playVideo();
        return;
      }
      // 呼叫統一的下一首處理（原生清單 / 應用層清單）
      playNextVideo();
    }
  }, [applySubtitles, dispatch, flushPendingUsage, onVideoChange, playNextVideo, playlistVideos, settings.defaultSubtitleLanguage, title, channelName, updatePlaybackState, videoId]);

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

      const expectedAudioState = playerStateRef.current;
      if (!expectedAudioState.muted && expectedAudioState.volume > 0) {
        currentPlayer.setVolume(expectedAudioState.volume);
        currentPlayer.unMute();
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

    setHandler('nexttrack', () => {
      playNextVideo();
    });
    setHandler('previoustrack', () => {
      playPreviousVideo();
    });

    navigator.mediaSession.playbackState = playerState.playing ? 'playing' : 'paused';

    return () => {
      setHandler('play', null);
      setHandler('pause', null);
      setHandler('seekbackward', null);
      setHandler('seekforward', null);
      setHandler('seekto', null);
      setHandler('nexttrack', null);
      setHandler('previoustrack', null);
    };
  }, [channelName, player, playerState.playing, playNextVideo, playPreviousVideo, seekRelative, syncCurrentTime, title, videoId]);

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

  const togglePlay = useCallback(() => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    if (playerStateRef.current.playing) {
      currentPlayer.pauseVideo();
    } else {
      currentPlayer.playVideo();
    }
  }, []);

  const handleVolumeChange = (_, newValue) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    const nextVolume = normalizeSliderValue(newValue);
    if (!Number.isFinite(nextVolume)) return;
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

  const setPlaybackRate = useCallback((rate) => {
    updatePlaybackState((prev) => ({ ...prev, playbackRate: rate }));
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    try {
      currentPlayer.setPlaybackRate(rate);
    } catch (e) {
      console.debug('setPlaybackRate error', e);
    }
  }, [updatePlaybackState]);

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

  const toggleSubtitles = useCallback(() => {
    const newSubtitlesState = !playerStateRef.current.subtitlesEnabled;
    updatePlaybackState((prev) => ({ ...prev, subtitlesEnabled: newSubtitlesState }));
    applySubtitles(newSubtitlesState, settings.defaultSubtitleLanguage);
    showNotice(newSubtitlesState ? '字幕已開啟' : '字幕已關閉', 'info');
  }, [applySubtitles, settings.defaultSubtitleLanguage, showNotice, updatePlaybackState]);

  const toggleLoop = useCallback(() => {
    const next = !loopEnabledRef.current;
    setLoopEnabled(next);
    loopEnabledRef.current = next;
    if (onLoopChange) {
      onLoopChange(next);
    }
    showNotice(next ? '循環播放已開啟' : '循環播放已關閉', 'info');
  }, [onLoopChange, showNotice]);

  const handleSpeedMenuOpen = (event) => {
    event.stopPropagation();
    setSpeedMenuAnchor(event.currentTarget);
  };

  const handleSpeedMenuClose = (event) => {
    event?.stopPropagation?.();
    setSpeedMenuAnchor(null);
  };

  const handleSelectSpeed = (rate, event) => {
    event?.stopPropagation?.();
    setPlaybackRate(rate);
    setSpeedMenuAnchor(null);
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

  const handleTogglePictureInPicture = useCallback(async () => {
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
  }, [isPipSupported, isTouchDevice, settings.enablePictureInPicture, showNotice, title, togglePictureInPicture]);

  useEffect(() => {
    if (lastLoadedVideoIdRef.current === videoId) {
      return;
    }
    lastLoadedVideoIdRef.current = videoId;
    const currentPlayer = playerRef.current;
    if (currentPlayer) {
      // 若 YouTube 內部當前已經在播放此影片（例如原生播放清單換首），避免重複 loadVideo 破壞清單
      const currentLoadedId = currentPlayer.getVideoData?.()?.video_id;
      if (currentLoadedId === videoId) {
        return;
      }

      // 若播放器原生清單中包含該影片，優先使用 playVideoAt 保持清單完整
      const currentPlaylist = currentPlayer.getPlaylist?.();
      if (Array.isArray(currentPlaylist) && currentPlaylist.includes(videoId)) {
        try {
          currentPlayer.playVideoAt(currentPlaylist.indexOf(videoId));
          return;
        } catch (e) {
          console.debug('playVideoAt error in useEffect', e);
        }
      }

      if (typeof currentPlayer.loadVideoById === 'function') {
        try {
          currentPlayer.loadVideoById(videoId);
          currentPlayer.playVideo();
        } catch (err) {
          console.debug('loadVideoById failed', err);
        }
      }
    }
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    toggleLoop,
    togglePictureInPicture: handleTogglePictureInPicture,
    togglePlay,
    setPlaybackRate,
    toggleSubtitles,
    isSubtitlesEnabled: () => playerStateRef.current.subtitlesEnabled,
    getPlaybackRate: () => playerStateRef.current.playbackRate,
    loadVideo: (targetVideoId) => {
      const currentPlayer = playerRef.current;
      if (currentPlayer && targetVideoId) {
        lastLoadedVideoIdRef.current = targetVideoId;
        try {
          currentPlayer.loadVideoById(targetVideoId);
          currentPlayer.playVideo();
        } catch (e) {
          console.debug('loadVideo error', e);
        }
      }
    },
    isLoopEnabled: () => loopEnabledRef.current,
    isPipActive,
    isPipSupported,
  }), [handleTogglePictureInPicture, isPipActive, isPipSupported, setPlaybackRate, toggleLoop, togglePlay, toggleSubtitles]);

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
          videoId={initialVideoIdRef.current}
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

          {isTouchDevice && settings.enableTouchGestures && playerState.fullscreen && (
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
              <Tooltip title="上一首">
                <IconButton onClick={playPreviousVideo} sx={{ color: 'white' }} size="small" aria-label="上一首">
                  <FaStepBackward />
                </IconButton>
              </Tooltip>

              <IconButton onClick={() => seekRelative(-10)} sx={{ color: 'white' }} size="small" aria-label="快退 10 秒">
                <FaBackward />
              </IconButton>

              <IconButton onClick={togglePlay} sx={{ color: 'white' }} size="small" aria-label={playerState.playing ? '暫停' : '播放'}>
                {playerState.playing ? <FaPause /> : <FaPlay />}
              </IconButton>

              <IconButton onClick={() => seekRelative(10)} sx={{ color: 'white' }} size="small" aria-label="快進 10 秒">
                <FaForward />
              </IconButton>

              <Tooltip title="下一首">
                <IconButton onClick={playNextVideo} sx={{ color: 'white' }} size="small" aria-label="下一首">
                  <FaStepForward />
                </IconButton>
              </Tooltip>

              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5, flexShrink: 1 }}>
                <IconButton onClick={toggleMute} sx={{ color: 'white' }} size="small">
                  {playerState.muted ? <FaVolumeMute /> : <FaVolumeUp />}
                </IconButton>
                <Slider
                  value={playerState.muted ? 0 : playerState.volume}
                  onChange={handleVolumeChange}
                  aria-label="音量"
                  sx={{
                    width: { xs: 50, sm: 70, md: 80 },
                    mx: 1,
                    '& .MuiSlider-track': { bgcolor: 'white' },
                    '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'white', mx: 0.5, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                {formatTime(displayCurrentTime)} / {formatTime(playerState.duration)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0.5 }}>
              <Tooltip title="播放速度">
                <Button
                  size="small"
                  onClick={handleSpeedMenuOpen}
                  sx={{
                    color: 'white',
                    minWidth: 44,
                    px: 0.8,
                    py: 0.25,
                    fontSize: '0.75rem',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    borderRadius: 1,
                    textTransform: 'none',
                  }}
                >
                  {playerState.playbackRate}x
                </Button>
              </Tooltip>

              <Tooltip title={playerState.subtitlesEnabled ? '關閉字幕' : '開啟字幕'}>
                <IconButton
                  size="small"
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

              <Tooltip title={loopEnabled ? '關閉循環播放' : '開啟循環播放'}>
                <IconButton
                  size="small"
                  onClick={toggleLoop}
                  sx={{
                    color: loopEnabled ? 'primary.main' : 'white',
                    bgcolor: loopEnabled ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                    '&:hover': {
                      color: loopEnabled ? 'primary.light' : 'grey.300'
                    }
                  }}
                >
                  <FaRedo />
                </IconButton>
              </Tooltip>

              <Tooltip title={isPipActive ? '關閉畫中畫' : isPipSupported ? '開啟畫中畫' : '此瀏覽器不支援畫中畫'}>
                <IconButton
                  size="small"
                  onClick={handleTogglePictureInPicture}
                  sx={{
                    color: isPipActive ? 'primary.main' : 'white',
                    bgcolor: isPipActive ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                    opacity: isPipSupported ? 1 : 0.5,
                    '&:hover': {
                      color: isPipActive ? 'primary.light' : 'grey.300'
                    }
                  }}
                >
                  <FaExternalLinkAlt />
                </IconButton>
              </Tooltip>

              <Tooltip title={playerState.fullscreen ? '退出全螢幕' : '全螢幕'}>
                <IconButton size="small" onClick={toggleFullscreen} sx={{ color: 'white' }}>
                  {playerState.fullscreen ? <FaCompress /> : <FaExpand />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}

      {/* 速度下拉選單 (共用) */}
      <Menu
        anchorEl={speedMenuAnchor}
        open={Boolean(speedMenuAnchor)}
        onClose={handleSpeedMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(24, 24, 27, 0.95)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            zIndex: 100002,
          }
        }}
      >
        {AVAILABLE_PLAYBACK_RATES.map((rate) => (
          <MenuItem
            key={rate}
            selected={playerState.playbackRate === rate}
            onClick={(e) => handleSelectSpeed(rate, e)}
            sx={{
              fontSize: '0.85rem',
              py: 0.8,
              px: 2,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            {rate}x {rate === 1 ? '(正常)' : ''}
          </MenuItem>
        ))}
      </Menu>

        {isTouchDevice && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              px: 1.5,
              pt: 0.75,
              pb: 'calc(6px + env(safe-area-inset-bottom))',
              minHeight: `${TOUCH_INLINE_CONTROLS_HEIGHT}px`,
              background: hasInlineTouchControls
                ? 'linear-gradient(180deg, rgba(8,12,24,0.95) 0%, rgba(12,18,32,0.98) 100%)'
                : 'linear-gradient(transparent, rgba(17,24,39,0.9) 24%, rgba(17,24,39,0.98))',
              color: 'white',
              zIndex: playerState.fullscreen ? 100000 : 3,
              backdropFilter: 'blur(6px)',
              borderTop: hasInlineTouchControls ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>
                {formatTime(displayCurrentTime)} / {formatTime(playerState.duration)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                雙擊兩側快進退
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <IconButton onClick={playPreviousVideo} sx={{ color: 'white', p: 0.6 }} aria-label="上一首">
                  <FaStepBackward size={13} />
                </IconButton>
                <IconButton onClick={() => seekRelative(-10)} sx={{ color: 'white', p: 0.6 }} aria-label="快退 10 秒">
                  <FaBackward size={13} />
                </IconButton>
                <IconButton onClick={togglePlay} sx={{ color: 'white', p: 0.75 }} aria-label={playerState.playing ? '暫停' : '播放'}>
                  {playerState.playing ? <FaPause size={16} /> : <FaPlay size={16} />}
                </IconButton>
                <IconButton onClick={() => seekRelative(10)} sx={{ color: 'white', p: 0.6 }} aria-label="快進 10 秒">
                  <FaForward size={13} />
                </IconButton>
                <IconButton onClick={playNextVideo} sx={{ color: 'white', p: 0.6 }} aria-label="下一首">
                  <FaStepForward size={13} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Tooltip title={loopEnabled ? '關閉循環播放' : '開啟循環播放'}>
                  <Button
                    size="small"
                    variant={loopEnabled ? 'contained' : 'outlined'}
                    color={loopEnabled ? 'primary' : 'inherit'}
                    onClick={toggleLoop}
                    sx={{
                      minWidth: 'auto',
                      px: 1,
                      py: 0.25,
                      fontSize: '0.75rem',
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: loopEnabled ? 'white' : 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <FaRedo size={11} />
                    循環
                  </Button>
                </Tooltip>

                <Tooltip title={isPipActive ? '關閉畫中畫' : isPipSupported ? '開啟畫中畫' : '不支援'}>
                  <Button
                    size="small"
                    variant={isPipActive ? 'contained' : 'outlined'}
                    color={isPipActive ? 'primary' : 'inherit'}
                    onClick={handleTogglePictureInPicture}
                    disabled={!isPipSupported}
                    sx={{
                      minWidth: 'auto',
                      px: 0.8,
                      py: 0.25,
                      fontSize: '0.75rem',
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: isPipActive ? 'white' : 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.4,
                    }}
                  >
                    <FaExternalLinkAlt size={10} />
                    小窗
                  </Button>
                </Tooltip>

                <Tooltip title={playerState.subtitlesEnabled ? '關閉字幕' : '開啟字幕'}>
                  <Button
                    size="small"
                    variant={playerState.subtitlesEnabled ? 'contained' : 'outlined'}
                    color={playerState.subtitlesEnabled ? 'primary' : 'inherit'}
                    onClick={toggleSubtitles}
                    sx={{
                      minWidth: 'auto',
                      px: 0.8,
                      py: 0.25,
                      fontSize: '0.75rem',
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: playerState.subtitlesEnabled ? 'white' : 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.4,
                    }}
                  >
                    <FaClosedCaptioning size={11} />
                    字幕
                  </Button>
                </Tooltip>

                <Tooltip title="播放速度">
                  <Button
                    size="small"
                    onClick={handleSpeedMenuOpen}
                    sx={{
                      minWidth: 'auto',
                      px: 0.8,
                      py: 0.25,
                      fontSize: '0.75rem',
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: 'white',
                      borderRadius: 1,
                      textTransform: 'none',
                    }}
                  >
                    {playerState.playbackRate}x
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
});

export default VideoPlayer;
