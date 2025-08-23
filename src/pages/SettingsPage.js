import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Container, Switch, FormControlLabel, Slider, Select, MenuItem, FormControl, InputLabel, Divider, Button, Paper, Alert } from '@mui/material';
import { updateSettings } from '../store/settingsSlice';
import { syncUserPlaylists, syncUserHistory } from '../services/authService';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

const SettingsPage = () => {
  const settings = useSelector((state) => state.settings);
  const dispatch = useDispatch();

  const handleSettingChange = (setting, value) => {
    dispatch(updateSettings({ [setting]: value }));
  };

  const handleSaveSettings = () => {
    // 在實際應用中，這裡可能需要將設置保存到本地存儲或後端
    alert('設置已保存');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          設置
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            外觀
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
              />
            }
            label="深色模式"
          />
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            播放設置
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography id="playback-rate-slider" gutterBottom>
              預設播放速度: {settings.defaultPlaybackRate}x
            </Typography>
            <Slider
              value={settings.defaultPlaybackRate}
              min={0.5}
              max={2}
              step={0.25}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1, label: '1x' },
                { value: 1.5, label: '1.5x' },
                { value: 2, label: '2x' },
              ]}
              onChange={(e, value) => handleSettingChange('defaultPlaybackRate', value)}
              aria-labelledby="playback-rate-slider"
              sx={{ maxWidth: 300 }}
            />
          </Box>
          
          <FormControl sx={{ mb: 2, minWidth: 200 }}>
            <InputLabel id="subtitle-language-label">預設字幕語言</InputLabel>
            <Select
              labelId="subtitle-language-label"
              value={settings.defaultSubtitleLanguage}
              label="預設字幕語言"
              onChange={(e) => handleSettingChange('defaultSubtitleLanguage', e.target.value)}
            >
              <MenuItem value="auto">自動 (影片預設)</MenuItem>
              <MenuItem value="zh-TW">中文 (繁體)</MenuItem>
              <MenuItem value="zh-CN">中文 (簡體)</MenuItem>
              <MenuItem value="en">英文</MenuItem>
              <MenuItem value="ja">日文</MenuItem>
              <MenuItem value="ko">韓文</MenuItem>
              <MenuItem value="none">不顯示字幕</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoplayVideos}
                  onChange={(e) => handleSettingChange('autoplayVideos', e.target.checked)}
                />
              }
              label="自動播放影片"
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            進階功能
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableBackgroundPlay}
                  onChange={(e) => handleSettingChange('enableBackgroundPlay', e.target.checked)}
                />
              }
              label="啟用背景播放"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enablePictureInPicture}
                  onChange={(e) => handleSettingChange('enablePictureInPicture', e.target.checked)}
                />
              }
              label="啟用畫中畫模式"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography id="sleep-timer-slider" gutterBottom>
              睡眠定時器: {settings.sleepTimerMinutes > 0 ? `${settings.sleepTimerMinutes} 分鐘` : '關閉'}
            </Typography>
            <Slider
              value={settings.sleepTimerMinutes}
              min={0}
              max={120}
              step={5}
              marks={[
                { value: 0, label: '關閉' },
                { value: 30, label: '30分' },
                { value: 60, label: '1小時' },
                { value: 120, label: '2小時' },
              ]}
              onChange={(e, value) => handleSettingChange('sleepTimerMinutes', value)}
              aria-labelledby="sleep-timer-slider"
              sx={{ maxWidth: 300 }}
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            帳號與同步
          </Typography>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            {useSelector((state) => state.auth.isAuthenticated) ? (
              <Box>
                <Typography variant="body1" gutterBottom>
                  已使用 Google 帳號登入
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => syncUserPlaylists()}
                  >
                    同步播放清單到 Google 帳號
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => syncUserHistory()}
                  >
                    同步觀看歷史到 Google 帳號
                  </Button>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    同步功能將會將您的本地播放清單和觀看歷史上傳到您的 Google 帳號，以便在不同裝置間共享。
                  </Alert>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" gutterBottom>
                  登入 Google 帳號以啟用跨裝置同步功能
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <GoogleAuthButton />
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  登入後，您可以將播放清單和觀看歷史同步到您的 Google 帳號，以便在不同裝置間共享。
                </Alert>
              </Box>
            )}
          </Paper>
          
          <Box sx={{ mt: 4 }}>
            <Button variant="contained" onClick={handleSaveSettings}>
              保存設置
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsPage;