import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 為 YouTube iframe 提供可落地的畫中畫策略：
 * 1. 支援 Document PiP 的瀏覽器，開啟獨立小窗播放。
 * 2. 不支援時明確回報，交由呼叫端決定降級提示。
 */
const usePictureInPicture = ({
  enabled = true,
  buildEmbedUrl,
  getCurrentTime,
  getShouldResumePlayback,
  onEnter,
  onExit,
}) => {
  const pipWindowRef = useRef(null);
  const sessionRef = useRef(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [supportMode, setSupportMode] = useState('unsupported');

  const cleanupSession = useCallback((shouldResume = true) => {
    const session = sessionRef.current;

    if (session && shouldResume && onExit) {
      const elapsedSeconds = session.wasPlaying
        ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
        : 0;

      onExit({
        estimatedCurrentTime: session.startSeconds + elapsedSeconds,
        resumePlaybackInSource: session.wasPlaying && getShouldResumePlayback?.() !== false,
      });
    }

    if (pipWindowRef.current) {
      pipWindowRef.current = null;
    }

    sessionRef.current = null;
    setIsPipActive(false);
  }, [getShouldResumePlayback, onExit]);

  useEffect(() => {
    const hasDocumentPip = typeof window !== 'undefined'
      && !!window.documentPictureInPicture
      && typeof window.documentPictureInPicture.requestWindow === 'function';

    setSupportMode(hasDocumentPip ? 'document' : 'unsupported');
    setIsPipSupported(enabled && hasDocumentPip);
  }, [enabled]);

  useEffect(() => {
    return () => {
      cleanupSession(false);
    };
  }, [cleanupSession]);

  const enterPictureInPicture = useCallback(async ({
    title = '畫中畫播放',
    width = 480,
    height = 270,
    autoplay = true,
  } = {}) => {
    if (!enabled) {
      return { ok: false, reason: 'disabled' };
    }

    if (!isPipSupported || typeof buildEmbedUrl !== 'function') {
      return { ok: false, reason: 'unsupported' };
    }

    try {
      const startSeconds = Math.max(0, Math.floor(getCurrentTime?.() || 0));
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width,
        height,
      });

      const embedUrl = buildEmbedUrl({
        autoplay,
        startSeconds,
      });

      const handleWindowClose = () => {
        cleanupSession(true);
      };

      pipWindow.document.title = title;
      pipWindow.document.documentElement.style.height = '100%';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.height = '100%';
      pipWindow.document.body.style.background = '#000';
      pipWindow.document.body.style.overflow = 'hidden';
      pipWindow.document.body.innerHTML = '';

      const iframe = pipWindow.document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.title = title;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';

      pipWindow.document.body.appendChild(iframe);
      pipWindow.addEventListener('pagehide', handleWindowClose, { once: true });

      pipWindowRef.current = pipWindow;
      sessionRef.current = {
        startSeconds,
        startedAt: Date.now(),
        wasPlaying: autoplay,
      };

      setIsPipActive(true);
      onEnter?.({
        startSeconds,
        wasPlaying: autoplay,
      });

      return { ok: true, mode: 'document' };
    } catch (error) {
      console.error('進入畫中畫模式失敗:', error);
      cleanupSession(false);
      return { ok: false, reason: 'error', error };
    }
  }, [buildEmbedUrl, cleanupSession, enabled, getCurrentTime, isPipSupported, onEnter]);

  const exitPictureInPicture = useCallback(async () => {
    if (!isPipActive) {
      return { ok: false, reason: 'inactive' };
    }

    const pipWindow = pipWindowRef.current;
    cleanupSession(true);

    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }

    return { ok: true };
  }, [cleanupSession, isPipActive]);

  const togglePictureInPicture = useCallback(async (options) => {
    if (isPipActive) {
      return exitPictureInPicture();
    }

    return enterPictureInPicture(options);
  }, [enterPictureInPicture, exitPictureInPicture, isPipActive]);

  return {
    isPipSupported,
    isPipActive,
    supportMode,
    enterPictureInPicture,
    exitPictureInPicture,
    togglePictureInPicture,
  };
};

export default usePictureInPicture;
