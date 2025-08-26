import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from './settingsSlice';
import playlistsReducer from './playlistsSlice';
import authReducer from './authSlice';
import progressReducer from './progressSlice';
import statisticsReducer from './statisticsSlice';

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    playlists: playlistsReducer,
    auth: authReducer,
    progress: progressReducer,
    statistics: statisticsReducer,
  },
});

export default store;