import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  darkMode: false,
  defaultPlaybackRate: 1,
  defaultSubtitleLanguage: 'auto',
  autoplayVideos: true,
  enableBackgroundPlay: true,
  enablePictureInPicture: true,
  sleepTimerMinutes: 0,
  showTrafficStats: true, // 顯示流量統計，預設開啟
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDefaultPlaybackRate: (state, action) => {
      state.defaultPlaybackRate = action.payload;
    },
    setDefaultSubtitleLanguage: (state, action) => {
      state.defaultSubtitleLanguage = action.payload;
    },
    toggleAutoplayVideos: (state) => {
      state.autoplayVideos = !state.autoplayVideos;
    },
    toggleBackgroundPlay: (state) => {
      state.enableBackgroundPlay = !state.enableBackgroundPlay;
    },
    togglePictureInPicture: (state) => {
      state.enablePictureInPicture = !state.enablePictureInPicture;
    },
    setSleepTimer: (state, action) => {
      state.sleepTimerMinutes = action.payload;
    },
    toggleTrafficStats: (state) => {
      state.showTrafficStats = !state.showTrafficStats;
    },
    updateSettings: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  toggleDarkMode,
  setDefaultPlaybackRate,
  setDefaultSubtitleLanguage,
  toggleAutoplayVideos,
  toggleBackgroundPlay,
  togglePictureInPicture,
  setSleepTimer,
  toggleTrafficStats,
  updateSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;