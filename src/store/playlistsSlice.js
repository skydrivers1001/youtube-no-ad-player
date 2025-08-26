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
    },
    setPlaylistVideos: (state, action) => {
      // 設置特定播放清單的影片列表
      const { playlistId, videos } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.videos = videos;
      }
    },
    setGoogleWatchHistory: (state, action) => {
      // 設置從 Google 獲取的觀看歷史
      state.watchHistory = action.payload.map(video => ({
        ...video,
        isFromGoogle: true
      }));
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
  setGooglePlaylists,
  setPlaylistVideos,
  setGoogleWatchHistory,
} = playlistsSlice.actions;

export default playlistsSlice.reducer;