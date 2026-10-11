import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Box, Button, Container, Paper, Typography, CircularProgress } from '@mui/material';
import { FaHome, FaShare } from 'react-icons/fa';
import { parseYouTubeSharePayload } from '../utils/parseYouTubeUrl';

const isValidVideoId = (videoId) =>
  typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId);

const isValidPlaylistId = (playlistId) =>
  typeof playlistId === 'string' && /^[A-Za-z0-9_-]{10,64}$/.test(playlistId);

const SharePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resolutionError, setResolutionError] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const shareInput = useMemo(() => {
    const rawSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    let decodedRaw = '';
    try {
      decodedRaw = decodeURIComponent(rawSearch);
    } catch (_) {
      decodedRaw = rawSearch;
    }

    return {
      title: searchParams.get('title') || '',
      text: searchParams.get('text') || '',
      url: searchParams.get('url') || searchParams.get('q') || (decodedRaw.includes('youtu') ? decodedRaw : ''),
      openExternalBrowser: searchParams.get('openExternalBrowser') || '',
    };
  }, [location.search, searchParams]);

  const parsed = useMemo(
    () => parseYouTubeSharePayload(shareInput),
    [shareInput]
  );

  const isVideo = parsed?.type === 'video' && isValidVideoId(parsed.id);
  const isPlaylist = parsed?.type === 'playlist' && isValidPlaylistId(parsed.id);

  useEffect(() => {
    const extraParams = new URLSearchParams();
    if (shareInput.title) extraParams.set('title', shareInput.title);
    if (shareInput.openExternalBrowser) extraParams.set('openExternalBrowser', shareInput.openExternalBrowser);

    if (isVideo) {
      const search = extraParams.toString() ? `?${extraParams.toString()}` : '';
      navigate(`/watch/${parsed.id}${search}`, { replace: true });
      return;
    }

    if (isPlaylist) {
      if (parsed.playlistId) extraParams.set('list', parsed.playlistId);
      const search = extraParams.toString() ? `?${extraParams.toString()}` : '';
      if (parsed.videoId && isValidVideoId(parsed.videoId)) {
        navigate(`/watch/${parsed.videoId}${search}`, { replace: true });
      } else {
        navigate(`/watch/playlist/${parsed.playlistId}${search}`, { replace: true });
      }
      return;
    }

    if (!shareInput.url && !shareInput.text && !shareInput.title) {
      setResolutionError('');
    } else {
      setResolutionError('無法辨識 YouTube 影片或播放清單連結');
    }
  }, [navigate, parsed, shareInput, isVideo, isPlaylist]);

  if (isVideo || isPlaylist) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 3 }} />
        <Typography variant="h6">正在開啟 YouTube No AD 播放器…</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={6} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3, color: 'primary.main', display: 'flex', justifyContent: 'center' }}>
          <FaShare size={32} />
        </Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          YouTube No AD 分享入口
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {resolutionError || '請從其他 App 選擇「YouTube No AD」來開啟 YouTube 影片。'}
        </Typography>
        {(shareInput.title || shareInput.text || shareInput.url) && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, wordBreak: 'break-all' }}>
            收到內容：{[shareInput.title, shareInput.text, shareInput.url].filter(Boolean).join(' / ')}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button component={Link} to="/" variant="outlined" startIcon={<FaHome />} sx={{ borderRadius: 2, px: 3 }}>
            回到首頁
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SharePage;
