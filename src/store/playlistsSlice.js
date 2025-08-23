import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  playlists: [
    {
      id: 'pl1',
      name: '我的收藏',
      videos: [
        {
          id: 'dQw4w9WgXcQ',
          title: 'Rick Astley - Never Gonna Give You Up',
          channel: 'Rick Astley',
          thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          duration: '3:33',
          addedAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'pl2',
      name: '學習資源',
      videos: [],
    },
  ],
  recentlyPlayed: [],
  watchHistory: [],
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
    },
    removePlaylist: (state, action) => {
      state.playlists = state.playlists.filter(playlist => playlist.id !== action.payload);
    },
    renamePlaylist: (state, action) => {
      const { id, name } = action.payload;
      const playlist = state.playlists.find(p => p.id === id);
      if (playlist) {
        playlist.name = name;
      }
    },
    addVideoToPlaylist: (state, action) => {
      const { playlistId, video } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        // 檢查影片是否已存在於播放清單中
        const videoExists = playlist.videos.some(v => v.id === video.id);
        if (!videoExists) {
          playlist.videos.push({
            ...video,
            addedAt: new Date().toISOString(),
          });
        }
      }
    },
    removeVideoFromPlaylist: (state, action) => {
      const { playlistId, videoId } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.videos = playlist.videos.filter(video => video.id !== videoId);
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
    },
    clearWatchHistory: (state) => {
      state.watchHistory = [];
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
} = playlistsSlice.actions;

export default playlistsSlice.reducer;