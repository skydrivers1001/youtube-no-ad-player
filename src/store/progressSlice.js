import { createSlice } from '@reduxjs/toolkit';

// 從localStorage載入播放進度
const loadProgressFromStorage = () => {
  try {
    const savedProgress = localStorage.getItem('videoProgress');
    return savedProgress ? JSON.parse(savedProgress) : {};
  } catch (error) {
    console.error('載入播放進度失敗:', error);
    return {};
  }
};

// 儲存播放進度到localStorage
const saveProgressToStorage = (progress) => {
  try {
    localStorage.setItem('videoProgress', JSON.stringify(progress));
  } catch (error) {
    console.error('儲存播放進度失敗:', error);
  }
};

const initialState = {
  // 格式: { videoId: { currentTime, duration, lastWatched, percentage } }
  videoProgress: loadProgressFromStorage(),
};

export const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    // 更新影片播放進度
    updateVideoProgress: (state, action) => {
      const { videoId, currentTime, duration } = action.payload;
      
      // 只有當播放時間大於5秒且小於總時長的95%時才儲存
      if (currentTime > 5 && currentTime < duration * 0.95) {
        const percentage = (currentTime / duration) * 100;
        
        state.videoProgress[videoId] = {
          currentTime,
          duration,
          percentage,
          lastWatched: new Date().toISOString(),
        };
        
        // 同步到localStorage
        saveProgressToStorage(state.videoProgress);
      }
    },
    
    // 清除特定影片的播放進度
    clearVideoProgress: (state, action) => {
      const { videoId } = action.payload;
      delete state.videoProgress[videoId];
      saveProgressToStorage(state.videoProgress);
    },
    
    // 清除所有播放進度
    clearAllProgress: (state) => {
      state.videoProgress = {};
      saveProgressToStorage({});
    },
    
    // 標記影片為已完成觀看
    markVideoCompleted: (state, action) => {
      const { videoId } = action.payload;
      if (state.videoProgress[videoId]) {
        delete state.videoProgress[videoId];
        saveProgressToStorage(state.videoProgress);
      }
    },
    
    // 批量清理舊的播放進度（超過30天的記錄）
    cleanupOldProgress: (state) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      Object.keys(state.videoProgress).forEach(videoId => {
        const progress = state.videoProgress[videoId];
        if (new Date(progress.lastWatched) < thirtyDaysAgo) {
          delete state.videoProgress[videoId];
        }
      });
      
      saveProgressToStorage(state.videoProgress);
    },
  },
});

export const {
  updateVideoProgress,
  clearVideoProgress,
  clearAllProgress,
  markVideoCompleted,
  cleanupOldProgress,
} = progressSlice.actions;

// 選擇器
export const selectVideoProgress = (state, videoId) => 
  state.progress.videoProgress[videoId];

export const selectAllProgress = (state) => 
  state.progress.videoProgress;

export const selectProgressCount = (state) => 
  Object.keys(state.progress.videoProgress).length;

export default progressSlice.reducer;