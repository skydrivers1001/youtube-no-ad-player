import { createSlice } from '@reduxjs/toolkit';

// 從localStorage載入觀看歷史
const loadWatchHistoryFromStorage = () => {
  try {
    const savedHistory = localStorage.getItem('watchHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('載入觀看歷史失敗:', error);
    return [];
  }
};

// 儲存觀看歷史到localStorage
const saveWatchHistoryToStorage = (history) => {
  try {
    localStorage.setItem('watchHistory', JSON.stringify(history));
  } catch (error) {
    console.error('儲存觀看歷史失敗:', error);
  }
};

// 儲存播放清單到localStorage
const savePlaylistsToStorage = (state) => {
  try {
    const dataToSave = {
      playlists: state.playlists,
      recentlyPlayed: state.recentlyPlayed,
    };
    localStorage.setItem('youtuber_playlists_data', JSON.stringify(dataToSave));
  } catch (error) {
    console.error('儲存播放清單數據失敗:', error);
  }
};

// 從localStorage載入播放清單數據
const loadPlaylistsFromStorage = () => {
  try {
    const savedData = localStorage.getItem('youtuber_playlists_data');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      return {
        playlists: parsedData.playlists || [],
        recentlyPlayed: parsedData.recentlyPlayed || [],
      };
    }
  } catch (error) {
    console.error('載入播放清單數據失敗:', error);
  }
  
  // 返回預設值
  return {
    playlists: [
      {
        id: 'pl1',
        name: '我的收藏',
        videos: [],
      },
      {
        id: 'pl2',
        name: '學習資源',
        videos: [],
      },
    ],
    recentlyPlayed: [],
  };
};

// 在模組載入時一次性載入數據，避免重複調用
const playlistsData = loadPlaylistsFromStorage();
const watchHistoryData = loadWatchHistoryFromStorage();

const initialState = {
  playlists: playlistsData.playlists || [],
  recentlyPlayed: playlistsData.recentlyPlayed || [],
  watchHistory: watchHistoryData,
  googlePlaylists: [],
  googleWatchHistory: [],
  playlistVideos: {},
};

export const playlistsSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {
    addPlaylist: (state, action) => {
      const newPlaylist = {
        id: `pl${state.playlists.length + 1}`,
        name: action.payload,
        videos: [],
      };
      state.playlists.push(newPlaylist);
      savePlaylistsToStorage(state);
    },
    setGooglePlaylists: (state, action) => {
      // 將從 Google API 獲取的播放清單添加到現有播放清單中
      const googlePlaylists = action.payload.map(playlist => ({
        id: `google_${playlist.id}`,
        name: playlist.title,
        description: playlist.description,
        thumbnail: playlist.thumbnail,
        videoCount: playlist.videoCount,
        videos: [], // 初始為空，需要另外獲取影片列表
        isGooglePlaylist: true,
        googleId: playlist.id
      }));
      
      // 移除之前的 Google 播放清單，避免重複
      state.playlists = state.playlists.filter(p => !p.isGooglePlaylist);
      
      // 添加新的 Google 播放清單
      state.playlists.push(...googlePlaylists);
      savePlaylistsToStorage(state);
    },
    setPlaylistVideos: (state, action) => {
      // 設置特定播放清單的影片列表
      const { playlistId, videos } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.videos = videos;
        savePlaylistsToStorage(state);
      }
    },
    setGoogleWatchHistory: (state, action) => {
      // 將從 Google API 獲取的觀看歷史添加到現有歷史中，並標記為來自 Google
      const googleHistory = action.payload.map(video => ({
        ...video,
        isFromGoogle: true,
        watchedAt: video.watchedAt || new Date().toISOString()
      }));
      
      // 移除之前的 Google 歷史記錄，避免重複
      state.watchHistory = state.watchHistory.filter(video => !video.isFromGoogle);
      
      // 添加新的 Google 歷史記錄到前面
      state.watchHistory.unshift(...googleHistory);
      
      // 限制總歷史記錄數量
      if (state.watchHistory.length > 200) {
        state.watchHistory = state.watchHistory.slice(0, 200);
      }
      
      // 儲存到localStorage
      saveWatchHistoryToStorage(state.watchHistory);
    },
    removePlaylist: (state, action) => {
      state.playlists = state.playlists.filter(playlist => playlist.id !== action.payload);
      savePlaylistsToStorage(state);
    },
    renamePlaylist: (state, action) => {
      const { id, name } = action.payload;
      const playlist = state.playlists.find(p => p.id === id);
      if (playlist) {
        playlist.name = name;
        savePlaylistsToStorage(state);
      }
    },
    addVideoToPlaylist: (state, action) => {
      const { playlistId, video } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        // 檢查影片是否已存在
        const existingVideo = playlist.videos.find(v => v.id === video.id);
        if (!existingVideo) {
          playlist.videos.push({
            ...video,
            addedAt: new Date().toISOString(),
          });
          savePlaylistsToStorage(state);
        }
      }
    },
    removeVideoFromPlaylist: (state, action) => {
      const { playlistId, videoId } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.videos = playlist.videos.filter(video => video.id !== videoId);
        savePlaylistsToStorage(state);
      }
    },
    addToRecentlyPlayed: (state, action) => {
      const video = action.payload;
      // 移除已存在的相同影片
      state.recentlyPlayed = state.recentlyPlayed.filter(v => v.id !== video.id);
      // 添加到最前面
      state.recentlyPlayed.unshift({
        ...video,
        playedAt: new Date().toISOString(),
      });
      // 限制最近播放的數量
      if (state.recentlyPlayed.length > 20) {
        state.recentlyPlayed = state.recentlyPlayed.slice(0, 20);
      }
      savePlaylistsToStorage(state);
    },
    addToWatchHistory: (state, action) => {
      const video = action.payload;
      // 檢查是否已存在於歷史記錄中
      const existingIndex = state.watchHistory.findIndex(v => v.id === video.id);
      if (existingIndex !== -1) {
        // 更新現有記錄
        state.watchHistory[existingIndex] = {
          ...video,
          watchedAt: new Date().toISOString(),
        };
      } else {
        // 添加新記錄
        state.watchHistory.unshift({
          ...video,
          watchedAt: new Date().toISOString(),
        });
      }
      // 限制歷史記錄的數量
      if (state.watchHistory.length > 100) {
        state.watchHistory = state.watchHistory.slice(0, 100);
      }
      savePlaylistsToStorage(state);
    },
    clearWatchHistory: (state, action) => {
      const { isGoogleHistory } = action.payload || {};
      if (isGoogleHistory) {
        // 清除 Google 歷史，保留本地歷史
        state.watchHistory = state.watchHistory.filter(video => !video.isFromGoogle);
      } else {
        // 清除本地歷史，保留 Google 歷史
        state.watchHistory = state.watchHistory.filter(video => video.isFromGoogle);
      }
      savePlaylistsToStorage(state);
    },
    clearAllWatchHistory: (state) => {
      // 清除所有觀看歷史（包括本地和 Google）
      state.watchHistory = [];
      savePlaylistsToStorage(state);
    },
  },
});

export const {
  addPlaylist,
  removePlaylist,
  renamePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  addToRecentlyPlayed,
  addToWatchHistory,
  clearWatchHistory,
  clearAllWatchHistory,
  setGooglePlaylists,
  setPlaylistVideos,
  setGoogleWatchHistory,
} = playlistsSlice.actions;

export default playlistsSlice.reducer;