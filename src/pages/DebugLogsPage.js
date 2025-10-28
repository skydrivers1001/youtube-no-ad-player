import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, Stack, Paper } from '@mui/material';
import telemetry from '../utils/telemetry';

const DebugLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [env, setEnv] = useState({});

  const refresh = () => {
    setLogs(telemetry.getLogs());
    setEnv({
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      ua: navigator.userAgent,
      mode: process.env.NODE_ENV,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const copy = async () => {
    const payload = JSON.stringify({ env, logs }, null, 2);
    await navigator.clipboard.writeText(payload);
    alert('Logs copied to clipboard');
  };

  const clear = () => {
    telemetry.clear();
    refresh();
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 3 }}>
        <Typography variant="h5">Debug 日誌（本機緩衝）</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          此頁面會顯示在瀏覽器本機存放的遙測事件與錯誤。用於 Render 上的問題定位。
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={refresh}>刷新</Button>
          <Button variant="outlined" onClick={copy}>複製 JSON</Button>
          <Button variant="text" color="error" onClick={clear}>清除</Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">環境資訊</Typography>
        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(env, null, 2)}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">事件與錯誤</Typography>
        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(logs.slice(-200), null, 2)}
        </Typography>
      </Paper>
    </Container>
  );
};

export default DebugLogsPage;