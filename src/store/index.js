import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from './settingsSlice';
import playlistsReducer from './playlistsSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    playlists: playlistsReducer,
    auth: authReducer,
  },
});

export default store;