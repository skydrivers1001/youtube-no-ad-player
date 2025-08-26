import React, { useState, useEffect, useRef } from 'react';
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
  
  // 播放器狀態
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
  
  // 控制項顯示狀態
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  
  // 檢測是否為觸控設備
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);
  
  // 數據使用量追蹤
  const [dataUsageTracker, setDataUsageTracker] = useState({
    lastRecordedTime: 0,
    totalWatchTime: 0,
    estimatedDataUsage: 0 // MB
  });
  const dataUsageIntervalRef = useRef(null);
  
  // 畫中畫功能
  const { 
    videoRef, 
    isPipSupported, 
    isPipActive, 
    togglePictureInPicture 
  } = usePictureInPicture({ 
    enabled: settings.pictureInPictureEnabled 
  });
  
  // 播放器選項
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0, // 隱藏原生控制項
      rel: 0, // 不顯示相關影片
      showinfo: 0, // 不顯示影片信息
      modestbranding: 1, // 隱藏YouTube標誌
      iv_load_policy: 3, // 隱藏註釋
      cc_load_policy: settings.defaultSubtitlesEnabled ? 1 : 0, // 根據設置顯示字幕
      hl: settings.defaultSubtitlesLanguage || 'zh-TW', // 字幕語言
    },
  };
  
  // 處理播放器就緒
  const handleReady = (event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    
    // 設置預設播放速度
    ytPlayer.setPlaybackRate(playerState.playbackRate);
    
    // 設置預設音量
    ytPlayer.setVolume(playerState.volume);
    
    // 記錄影片播放統計
    if (videoId) {
      // 記錄初始數據使用量（估算影片開始播放的數據消耗）
      dispatch(recordDataUsage(5)); // 假設開始播放消耗5MB
      console.log(`記錄影片播放數據使用: ${videoId}`);
    }
    
    // 恢復播放進度（延遲執行以確保影片已載入）
    if (savedProgress && savedProgress.currentTime > 5) {
      setTimeout(() => {
        ytPlayer.seekTo(savedProgress.currentTime);
        console.log(`恢復播放進度: ${Math.floor(savedProgress.currentTime)}秒 (${savedProgress.percentage.toFixed(1)}%)`);
      }, 1000);
    }
    
    // 調用外部onReady回調
    if (onReady) {
      onReady(ytPlayer);
    }
  };
  
  // 處理播放器狀態變化
  const handleStateChange = (event) => {
    const isPlaying = event.data === 1;
    const isEnded = event.data === 0;
    
    setPlayerState(prev => ({
      ...prev,
      playing: isPlaying,
      duration: player ? player.getDuration() : 0,
    }));
    
    // 數據使用量追蹤：開始或停止追蹤
    if (isPlaying) {
      startDataUsageTracking();
    } else {
      stopDataUsageTracking();
    }
    
    // 如果影片播放結束，清除播放進度
    if (isEnded && player) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      
      // 如果播放到95%以上，認為已完成觀看
      if (currentTime / duration > 0.95) {
        dispatch(markVideoCompleted({ videoId }));
        console.log('影片播放完成，已清除播放進度');
      }
    }
  };
  
  // 更新當前播放時間和緩衝進度
  useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const buffered = player.getVideoLoadedFraction() * duration;
      
      setPlayerState(prev => ({
        ...prev,
        currentTime,
        duration,
        buffered,
      }));
      
      // 自動儲存播放進度（每10秒儲存一次，且只在播放時儲存）
      if (playerState.playing && duration > 0 && currentTime > 5) {
        dispatch(updateVideoProgress({
          videoId,
          currentTime,
          duration
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [player, playerState.playing, dispatch, videoId]);
  
  // 數據使用量追蹤函數
  const startDataUsageTracking = () => {
    if (dataUsageIntervalRef.current) return; // 避免重複啟動
    
    const startTime = Date.now();
    setDataUsageTracker(prev => ({ ...prev, lastRecordedTime: startTime }));
    
    dataUsageIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const timeDiff = (currentTime - dataUsageTracker.lastRecordedTime) / 1000; // 秒
      
      if (timeDiff > 0) {
        // 估算數據使用量：假設720p影片約2MB/分鐘，1080p約4MB/分鐘
        // 這裡使用保守估計3MB/分鐘
        const estimatedUsageMB = (timeDiff / 60) * 3;
        
        setDataUsageTracker(prev => {
          const newEstimatedUsage = prev.estimatedDataUsage + estimatedUsageMB;
          
          // 每30秒記錄一次到Redux store
            if (newEstimatedUsage >= 30) { // 累積30MB後記錄
              dispatch(recordDataUsage(newEstimatedUsage));
            
            return {
              ...prev,
              lastRecordedTime: currentTime,
              totalWatchTime: prev.totalWatchTime + timeDiff,
              estimatedDataUsage: 0 // 重置本地累積
            };
          }
          
          return {
            ...prev,
            lastRecordedTime: currentTime,
            totalWatchTime: prev.totalWatchTime + timeDiff,
            estimatedDataUsage: newEstimatedUsage
          };
        });
      }
    }, 5000); // 每5秒檢查一次
  };
  
  const stopDataUsageTracking = () => {
    if (dataUsageIntervalRef.current) {
      clearInterval(dataUsageIntervalRef.current);
      dataUsageIntervalRef.current = null;
      
      // 停止時記錄剩餘的數據使用量
      if (dataUsageTracker.estimatedDataUsage > 0) {
        dispatch(recordDataUsage(dataUsageTracker.estimatedDataUsage));
        
        setDataUsageTracker(prev => ({
          ...prev,
          estimatedDataUsage: 0
        }));
      }
    }
  };
  
  // 組件卸載時清除全螢幕模式的影響並儲存播放進度
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      
      // 清理數據使用量追蹤
      stopDataUsageTracking();
      
      // 在組件卸載時儲存最後的播放進度
      if (player && playerState.duration > 0 && playerState.currentTime > 5) {
        dispatch(updateVideoProgress({
          videoId,
          currentTime: playerState.currentTime,
          duration: playerState.duration
        }));
      }
    };
  }, [player, playerState.currentTime, playerState.duration, dispatch, videoId]);
  
  // 處理鼠標移動顯示/隱藏控制項
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // 觸控設備延長顯示時間
    const hideDelay = isTouchDevice ? 5000 : 3000;
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (playerState.playing) {
        setShowControls(false);
      }
    }, hideDelay);
  };
  
  // 處理觸控事件顯示控制項
  const handleTouchInteraction = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // 觸控設備顯示更長時間
    controlsTimeoutRef.current = setTimeout(() => {
      if (playerState.playing) {
        setShowControls(false);
      }
    }, 5000);
  };
  
  // 播放/暫停
  const togglePlay = () => {
    if (!player) return;
    
    if (playerState.playing) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };
  
  // 調整音量
  const handleVolumeChange = (event, newValue) => {
    player.setVolume(newValue);
    setPlayerState(prev => ({
      ...prev,
      volume: newValue,
      muted: newValue === 0,
    }));
  };
  
  // 靜音切換
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
  
  // 調整播放速度
  const setPlaybackRate = (rate) => {
    player.setPlaybackRate(rate);
    setPlayerState(prev => ({ ...prev, playbackRate: rate }));
  };
  
  // 全螢幕切換
  const toggleFullscreen = () => {
    setPlayerState(prev => {
      const newFullscreenState = !prev.fullscreen;
      
      // 如果進入全螢幕模式，隱藏滾動條
      if (newFullscreenState) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      
      return { ...prev, fullscreen: newFullscreenState };
    });
  };
  
  // 專注模式切換
  const toggleFocusMode = () => {
    setPlayerState(prev => ({ ...prev, focusMode: !prev.focusMode }));
  };
  
  // 調整播放進度
  const handleSeek = (event, newValue) => {
    player.seekTo(newValue);
    setPlayerState(prev => ({ ...prev, currentTime: newValue }));
  };
  
  // 快進/快退
  const seekRelative = (seconds) => {
    const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds));
    player.seekTo(newTime);
    setPlayerState(prev => ({ ...prev, currentTime: newTime }));
  };
  
  // 格式化時間
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // 雙擊事件處理
  const handleDoubleClick = (side) => {
    if (side === 'left') {
      seekRelative(-10); // 左側雙擊快退10秒
    } else if (side === 'right') {
      seekRelative(10); // 右側雙擊快進10秒
    }
  };
  
  return (
    <Box 
      sx={{
        position: 'relative',
        paddingTop: playerState.fullscreen ? '0' : '56.25%', // 16:9 寬高比 (9/16 * 100%)
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
      {/* 左側雙擊區域 */}
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
      
      {/* 右側雙擊區域 */}
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
      
      {/* 中間區域 - 播放/暫停切換 */}
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
      
      {/* YouTube播放器 */}
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
          opts={{
            ...opts,
            height: playerState.fullscreen ? '100%' : opts.height,
            width: playerState.fullscreen ? '100%' : opts.width,
          }}
          onReady={handleReady}
          onStateChange={handleStateChange}
          containerClassName={`youtube-container ${playerState.fullscreen ? 'fullscreen' : ''}`}
          className="youtube-player"
          iframeClassName="youtube-iframe"
          style={{
            width: playerState.fullscreen ? '100%' : '100%',
            height: playerState.fullscreen ? '100%' : '100%',
          }}
        />
      </Box>
      
      {/* 自定義控制項 */}
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
          {/* 進度條 */}
          <Box sx={{ mb: 1, position: 'relative' }}>
            {/* 緩衝進度 */}
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
            
            {/* 播放進度 */}
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
          
          {/* 控制按鈕 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* 播放/暫停按鈕 */}
              <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                {playerState.playing ? <FaPause /> : <FaPlay />}
              </IconButton>
              
              {/* 快退按鈕 */}
              <IconButton onClick={() => seekRelative(-10)} sx={{ color: 'white' }}>
                <FaBackward />
              </IconButton>
              
              {/* 快進按鈕 */}
              <IconButton onClick={() => seekRelative(10)} sx={{ color: 'white' }}>
                <FaForward />
              </IconButton>
              
              {/* 音量控制 */}
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
              
              {/* 時間顯示 */}
              <Typography variant="body2" sx={{ color: 'white', mx: 1 }}>
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* 播放速度選擇 */}
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
              
              {/* 畫中畫按鈕 */}
              {isPipSupported && settings.pictureInPictureEnabled && (
                <Tooltip title="畫中畫模式">
                  <IconButton onClick={togglePictureInPicture} sx={{ color: 'white' }}>
                    <FaExternalLinkAlt />
                  </IconButton>
                </Tooltip>
              )}
              
              {/* 全螢幕按鈕 */}
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