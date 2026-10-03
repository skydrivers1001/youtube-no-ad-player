import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Box, Button, Container, Paper, Typography, CircularProgress } from '@mui/material';
import { FaHome, FaShare } from 'react-icons/fa';
import { extractYouTubeVideoIdFromSharePayload } from '../utils/parseYouTubeUrl';

const isValidVideoId = (videoId) =>
  typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId);

const SharePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resolutionError, setResolutionError] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const shareInput = useMemo(() => ({
    title: searchParams.get('title') || '',
    text: searchParams.get('text') || '',
    url: searchParams.get('url') || '',
  }), [searchParams]);

  const videoId = useMemo(
    () => extractYouTubeVideoIdFromSharePayload(shareInput),
    [shareInput]
  );

  useEffect(() => {
    if (isValidVideoId(videoId)) {
      const title = shareInput.title || '';
      const targetSearch = title ? `?title=${encodeURIComponent(title)}` : '';
      navigate(`/watch/${videoId}${targetSearch}`, { replace: true });
      return;
    }

    if (!shareInput.url && !shareInput.text && !shareInput.title) {
      setResolutionError('');
    } else {
      setResolutionError('無法辨識 YouTube 影片連結');
    }
  }, [navigate, shareInput.text, shareInput.title, shareInput.url, videoId]);

  if (isValidVideoId(videoId)) {
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
