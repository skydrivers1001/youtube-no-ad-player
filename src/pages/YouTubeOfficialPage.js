import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardMedia, CardContent, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import youtubeService from '../services/youtubeService';

const YouTubeOfficialPage = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth?.accessToken);

  // 解析 YouTube 連結中的影片 ID（支援 watch?v=、youtu.be 與 shorts）
  const extractVideoId = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      if (/youtu\.be$/i.test(u.hostname)) {
        const id = u.pathname.split('/')[1];
        return id || null;
      }
      if (/youtube\.com$/i.test(u.hostname)) {
        if (u.pathname.startsWith('/watch')) {
          return u.searchParams.get('v');
        }
        if (u.pathname.startsWith('/shorts/')) {
          return u.pathname.split('/')[2] || null;
        }
      }
    } catch (_) {}
    return null;
  };

  // 方案A：本站可播放清單
  const [siteQuery, setSiteQuery] = useState('');
  const [siteResults, setSiteResults] = useState([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const observerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const cseInitTimerRef = useRef(null);
  const enterCleanupRef = useRef(null);
  const submitCleanupRef = useRef(null);

  const getSearchBoxQuery = () => {
    const box = document.getElementById('gcse-searchbox');
    if (!box) return '';
    const input = box.querySelector('input[type="text"], input');
    return (input?.value || '').trim();
  };

  const fetchSitePlayable = async (q) => {
    if (!q) return;
    if (q === siteQuery && siteResults.length > 0) return; // 簡單避免重複抓取
    setSiteQuery(q);
    setSiteLoading(true);
    try {
      // 只聚焦 YouTube 影片
      const query = `${q} site:youtube.com`;
      const res = await youtubeService.searchVideos(query, { duration: 'any', uploadDate: 'any' }, accessToken);
      const items = res?.data?.items || [];
      setSiteResults(items);
    } catch (e) {
      console.warn('fetchSitePlayable error', e);
      setSiteResults([]);
    } finally {
      setSiteLoading(false);
    }
  };

  useEffect(() => {
    function renderCSE() {
      try {
        if (window.google && window.google.search && window.google.search.cse && window.google.search.cse.element) {
          // 綁定同一個 gname 讓 searchbox 與 results 配對
          window.google.search.cse.element.render({
            div: 'gcse-searchbox',
            tag: 'searchbox-only',
            attributes: {
              gname: 'ytcse',
              newWindow: false,
              enableAutoComplete: true
            }
          });
          window.google.search.cse.element.render({
            div: 'gcse-results',
            tag: 'searchresults-only',
            attributes: { gname: 'ytcse', linkTarget: '_self' }
          });
        }
      } catch (e) {
        console.warn('CSE render warning:', e);
      }
    }

    // 嘗試在 cse.js 準備好後才渲染搜尋框與結果，並綁定事件/觀察者
    const ensureCseRendered = () => {
      const box = document.getElementById('gcse-searchbox');
      if (!box) return;
      // 若已渲染出 .gsc-search-box，避免重複 render
      if (box.querySelector('.gsc-search-box')) {
        // 已渲染：確保事件與 observer 綁定
        if (!observerRef.current) {
          setupObserver && setupObserver();
        }
        if (!enterCleanupRef.current) {
          enterCleanupRef.current = (setupEnterListener && setupEnterListener()) || null;
        }
        if (!submitCleanupRef.current) {
          submitCleanupRef.current = (setupCseSubmitHijack && setupCseSubmitHijack()) || null;
        }
        return;
      }

      if (window.google && window.google.search && window.google.search.cse && window.google.search.cse.element) {
        renderCSE();
        // 渲染後綁定監聽與 observer
        setupObserver && setupObserver();
        enterCleanupRef.current && enterCleanupRef.current();
        submitCleanupRef.current && submitCleanupRef.current();
        enterCleanupRef.current = (setupEnterListener && setupEnterListener()) || null;
        submitCleanupRef.current = (setupCseSubmitHijack && setupCseSubmitHijack()) || null;
      } else {
        // 尚未就緒：稍後重試
        if (cseInitTimerRef.current) clearTimeout(cseInitTimerRef.current);
        cseInitTimerRef.current = setTimeout(ensureCseRendered, 250);
      }
    };

    // 攔截結果點擊，站內播放而不是跳轉到 YouTube
    const onResultClick = (e) => {
      const container = document.getElementById('gcse-results');
      if (!container) return;
      if (!container.contains(e.target)) return;
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!/youtu\.be|youtube\.com/i.test(href)) return;
      const vid = extractVideoId(href);
      if (vid) {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/watch/${vid}`);
      }
    };

    // 監聽 CSE 結果變化，觸發本站可播放清單抓取
    const setupObserver = () => {
      const resultsRoot = document.getElementById('gcse-results');
      if (!resultsRoot) return;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      const observer = new MutationObserver(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          const q = getSearchBoxQuery();
          if (q) fetchSitePlayable(q);
        }, 300);
      });
      observer.observe(resultsRoot, { childList: true, subtree: true });
      observerRef.current = observer;
    };

    // 監聽 Enter 送出
    const setupEnterListener = () => {
      const box = document.getElementById('gcse-searchbox');
      if (!box) return () => {};
      const input = box.querySelector('input[type="text"], input');
      if (!input) return () => {};
      const keyHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            const q = getSearchBoxQuery();
            // 同頁執行 CSE 搜尋
            try {
              if (window.google && window.google.search && window.google.search.cse && window.google.search.cse.element) {
                const el = window.google.search.cse.element.getElement('ytcse');
                if (el && typeof el.execute === 'function') el.execute(q || '');
              }
            } catch (err) {
              console.warn('CSE execute on Enter failed', err);
            }
            if (q) fetchSitePlayable(q);
          }, 100);
        }
      };
      input.addEventListener('keydown', keyHandler);
      return () => input.removeEventListener('keydown', keyHandler);
    };

    // 直接攔截 CSE 表單 submit / 按鈕 click，避免跳轉外頁
    const setupCseSubmitHijack = () => {
      const box = document.getElementById('gcse-searchbox');
      if (!box) return () => {};
      const form = box.querySelector('form');
      const button = box.querySelector('button.gsc-search-button, input.gsc-search-button');

      const handler = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const q = getSearchBoxQuery();
        try {
          if (window.google && window.google.search && window.google.search.cse && window.google.search.cse.element) {
            const el = window.google.search.cse.element.getElement('ytcse');
            if (el && typeof el.execute === 'function') el.execute(q || '');
          }
        } catch (err) {
          console.warn('CSE execute submit/click failed', err);
        }
        if (q) fetchSitePlayable(q);
        return false;
      };

      if (form) form.addEventListener('submit', handler);
      if (button) button.addEventListener('click', handler);

      return () => {
        if (form) form.removeEventListener('submit', handler);
        if (button) button.removeEventListener('click', handler);
      };
    };

    // 在 useEffect 內（renderCSE、setupObserver 等之後）
    const executeCseSamePage = () => {
      const q = getSearchBoxQuery();
      try {
        if (window.google && window.google.search && window.google.search.cse && window.google.search.cse.element) {
          const el = window.google.search.cse.element.getElement('ytcse');
          if (el && typeof el.execute === 'function') el.execute(q || '');
        }
      } catch (err) {
        console.warn('CSE execute (global) failed', err);
      }
      if (q) fetchSitePlayable(q);
    };

    ensureCseRendered();
    // 綁定結果點擊攔截（捕獲階段，避免預設行為導致跳轉）
    document.addEventListener('click', onResultClick, true);
    
    // 全域攔截搜尋框的 submit/click/Enter，強制同頁執行
    const onSubmitCapture = (e) => {
      const box = document.getElementById('gcse-searchbox');
      if (box && e.target && box.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        executeCseSamePage();
      }
    };
    const onClickSearchBtnCapture = (e) => {
      const box = document.getElementById('gcse-searchbox');
      if (!box || !e.target || !box.contains(e.target)) return;
      const btn = e.target.closest('button.gsc-search-button, input.gsc-search-button');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        executeCseSamePage();
      }
    };
    const onKeydownEnterCapture = (e) => {
      if (e.key !== 'Enter') return;
      const box = document.getElementById('gcse-searchbox');
      if (box && e.target && box.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        executeCseSamePage();
      }
    };
    
    document.addEventListener('submit', onSubmitCapture, true);
    document.addEventListener('click', onClickSearchBtnCapture, true);
    document.addEventListener('keydown', onKeydownEnterCapture, true);
    
    return () => {
      // 解除結果點擊攔截
      document.removeEventListener('click', onResultClick, true);
      // 解除全域攔截
      document.removeEventListener('submit', onSubmitCapture, true);
      document.removeEventListener('click', onClickSearchBtnCapture, true);
      document.removeEventListener('keydown', onKeydownEnterCapture, true);
      // 解除 Enter 與 submit/click 綁定（區域綁定，保險）
      if (enterCleanupRef.current) { try { enterCleanupRef.current(); } catch (_) {} enterCleanupRef.current = null; }
      if (submitCleanupRef.current) { try { submitCleanupRef.current(); } catch (_) {} submitCleanupRef.current = null; }
      // 清除初始化與防抖計時器
      if (cseInitTimerRef.current) { clearTimeout(cseInitTimerRef.current); cseInitTimerRef.current = null; }
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      // 中止結果區 observer
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    };
  }, [navigate, accessToken]);

  const renderSiteResults = () => {
    if (siteLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (!siteQuery) {
      return (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 2 }}>
          輸入關鍵字並送出後，這裡會顯示可在本站直接播放的影片
        </Typography>
      );
    }
    if (siteResults.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 2 }}>
          未找到與「{siteQuery}」對應的站內可播放影片
        </Typography>
      );
    }
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {siteResults.map(item => (
          <Grid item xs={12} sm={6} md={6} lg={6} key={item.id}>
            <Card 
              sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' }, height: '100%' }}
              onClick={() => navigate(`/watch/${item.id}?title=${encodeURIComponent(item.title)}&channel=${encodeURIComponent(item.channel)}`)}
            >
              <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                <CardMedia
                  component="img"
                  image={item.thumbnail}
                  alt={item.title}
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <CardContent>
                <Typography gutterBottom variant="subtitle1" component="div" noWrap>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.channel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.duration} · {item.views}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        align="center"
        sx={{
          color: 'white',
          fontWeight: 700,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          mb: 4
        }}
      >
        YouTube 搜尋
      </Typography>
      <Paper elevation={8} sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.95)' }}>
        <div id="gcse-searchbox" className="gcse-searchbox-only"></div>
      </Paper>
      <Box sx={{ mt: 2 }}>
        <div id="gcse-results" className="gcse-searchresults-only"></div>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          本站可播放
          {siteQuery ? `：${siteQuery}` : ''}
        </Typography>
        {renderSiteResults()}
      </Box>
    </Box>
  );
};

export default YouTubeOfficialPage;