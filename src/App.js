import React, { useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

// 頁面組件
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PlayerPage from './pages/PlayerPage';
import PlaylistsPage from './pages/PlaylistsPage';
import SettingsPage from './pages/SettingsPage';

// 認證組件
import GoogleAuthCallback from './components/auth/GoogleAuthCallback';
import { loadAuthFromStorage } from './services/authService';
import { loginSuccess } from './store/authSlice';

// UI組件
import Navbar from './components/ui/Navbar';

// 樣式
import './App.css';

function App() {
  // 從Redux存儲獲取深色模式設置
  const darkMode = useSelector((state) => state.settings.darkMode);
  const dispatch = useDispatch();
  
  // 在應用啟動時從本地存儲加載認證狀態
  useEffect(() => {
    const authData = loadAuthFromStorage();
    if (authData) {
      dispatch(loginSuccess(authData));
    }
  }, [dispatch]);

  // 創建主題
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#ff0000', // YouTube紅色
          },
          secondary: {
            main: '#282828', // YouTube深灰色
          },
          background: {
            default: darkMode ? '#121212' : '#f9f9f9',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
            <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/watch/:videoId" element={<PlayerPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
        </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
