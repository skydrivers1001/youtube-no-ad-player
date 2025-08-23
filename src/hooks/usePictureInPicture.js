import { useState, useEffect, useRef } from 'react';

/**
 * 自定義鉤子，用於處理畫中畫（Picture-in-Picture）功能
 * @param {Object} options - 配置選項
 * @param {boolean} options.enabled - 是否啟用畫中畫功能
 * @returns {Object} 包含畫中畫狀態和控制方法的對象
 */
const usePictureInPicture = ({ enabled = true }) => {
  const videoRef = useRef(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);

  // 檢查瀏覽器是否支援畫中畫
  useEffect(() => {
    const checkPipSupport = () => {
      if (document.pictureInPictureEnabled || 
          (document.documentElement.webkitRequestPictureInPicture) ||
          (document.documentElement.requestPictureInPicture)) {
        setIsPipSupported(true);
      } else {
        setIsPipSupported(false);
      }
    };

    checkPipSupport();
  }, []);

  // 監聽畫中畫事件
  useEffect(() => {
    if (!videoRef.current || !enabled) return;

    const video = videoRef.current;

    const handleEnterPip = () => {
      setIsPipActive(true);
    };

    const handleExitPip = () => {
      setIsPipActive(false);
    };

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleExitPip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleExitPip);
    };
  }, [videoRef, enabled]);

  // 進入畫中畫模式
  const enterPictureInPicture = async () => {
    if (!videoRef.current || !isPipSupported || !enabled) return;

    try {
      if (document.pictureInPictureElement !== videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('進入畫中畫模式失敗:', error);
    }
  };

  // 退出畫中畫模式
  const exitPictureInPicture = async () => {
    if (!document.pictureInPictureElement || !isPipSupported || !enabled) return;

    try {
      await document.exitPictureInPicture();
    } catch (error) {
      console.error('退出畫中畫模式失敗:', error);
    }
  };

  // 切換畫中畫模式
  const togglePictureInPicture = async () => {
    if (isPipActive) {
      await exitPictureInPicture();
    } else {
      await enterPictureInPicture();
    }
  };

  return {
    videoRef,
    isPipSupported,
    isPipActive,
    enterPictureInPicture,
    exitPictureInPicture,
    togglePictureInPicture
  };
};

export default usePictureInPicture;