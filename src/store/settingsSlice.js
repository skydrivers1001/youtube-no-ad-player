import { createSlice } from '@reduxjs/toolkit';

const SETTINGS_STORAGE_KEY = 'youtuber_no_ad_settings';

const defaultSettings = {
  darkMode: false,
  defaultPlaybackRate: 1,
  defaultSubtitleLanguage: 'auto',
  defaultSubtitlesEnabled: true, // 預設開啟字幕
  autoplayVideos: true,
  enableBackgroundPlay: true,
  enablePictureInPicture: true,
  sleepTimerMinutes: 0,
  showTrafficStats: true, // 顯示流量統計，預設開啟
};

const loadSettingsFromStorage = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch (error) {
    console.error('載入設定失敗:', error);
    return defaultSettings;
  }
};

const saveSettingsToStorage = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('儲存設定失敗:', error);
  }
};

const initialState = loadSettingsFromStorage();

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      saveSettingsToStorage(state);
    },
    setDefaultPlaybackRate: (state, action) => {
      state.defaultPlaybackRate = action.payload;
      saveSettingsToStorage(state);
    },
    setDefaultSubtitleLanguage: (state, action) => {
      state.defaultSubtitleLanguage = action.payload;
      saveSettingsToStorage(state);
    },
    toggleDefaultSubtitles: (state) => {
      state.defaultSubtitlesEnabled = !state.defaultSubtitlesEnabled;
      saveSettingsToStorage(state);
    },
    toggleAutoplayVideos: (state) => {
      state.autoplayVideos = !state.autoplayVideos;
      saveSettingsToStorage(state);
    },
    toggleBackgroundPlay: (state) => {
      state.enableBackgroundPlay = !state.enableBackgroundPlay;
      saveSettingsToStorage(state);
    },
    togglePictureInPicture: (state) => {
      state.enablePictureInPicture = !state.enablePictureInPicture;
      saveSettingsToStorage(state);
    },
    setSleepTimer: (state, action) => {
      state.sleepTimerMinutes = action.payload;
      saveSettingsToStorage(state);
    },
    toggleTrafficStats: (state) => {
      state.showTrafficStats = !state.showTrafficStats;
      saveSettingsToStorage(state);
    },
    updateSettings: (state, action) => {
      const nextState = { ...state, ...action.payload };
      saveSettingsToStorage(nextState);
      return nextState;
    },
  },
});

export const {
  toggleDarkMode,
  setDefaultPlaybackRate,
  setDefaultSubtitleLanguage,
  toggleDefaultSubtitles,
  toggleAutoplayVideos,
  toggleBackgroundPlay,
  togglePictureInPicture,
  setSleepTimer,
  toggleTrafficStats,
  updateSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
