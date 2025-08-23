import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings } from '../store/settingsSlice';

/**
 * 自定義鉤子，用於處理睡眠定時器功能
 * @param {Object} options - 配置選項
 * @param {Function} options.onTimerEnd - 定時器結束時的回調函數
 * @returns {Object} 包含睡眠定時器狀態和控制方法的對象
 */
const useSleepTimer = ({ onTimerEnd }) => {
  const dispatch = useDispatch();
  const { sleepTimerMinutes } = useSelector((state) => state.settings);
  
  const [isActive, setIsActive] = useState(sleepTimerMinutes > 0);
  const [timeLeft, setTimeLeft] = useState(sleepTimerMinutes * 60); // 轉換為秒
  const timerRef = useRef(null);
  
  // 啟動定時器
  const startTimer = (minutes) => {
    // 清除現有定時器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 更新 Redux 中的設置
    dispatch(updateSettings({ sleepTimerMinutes: minutes }));
    
    // 設置新的定時器狀態
    setIsActive(true);
    setTimeLeft(minutes * 60);
  };
  
  // 停止定時器
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 更新 Redux 中的設置
    dispatch(updateSettings({ sleepTimerMinutes: 0 }));
    
    // 重置定時器狀態
    setIsActive(false);
    setTimeLeft(0);
  };
  
  // 格式化剩餘時間
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // 監聽定時器狀態變化
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // 定時器結束
            clearInterval(timerRef.current);
            setIsActive(false);
            
            // 調用結束回調
            if (onTimerEnd) {
              onTimerEnd();
            }
            
            // 更新 Redux 中的設置
            dispatch(updateSettings({ sleepTimerMinutes: 0 }));
            
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, dispatch, onTimerEnd]);
  
  // 監聽 Redux 中的設置變化
  useEffect(() => {
    if (sleepTimerMinutes > 0 && !isActive) {
      setIsActive(true);
      setTimeLeft(sleepTimerMinutes * 60);
    } else if (sleepTimerMinutes === 0 && isActive) {
      setIsActive(false);
      setTimeLeft(0);
    }
  }, [sleepTimerMinutes, isActive]);
  
  return {
    isActive,
    timeLeft,
    formattedTimeLeft: formatTimeLeft(),
    startTimer,
    stopTimer
  };
};

export default useSleepTimer;