/**
 * 客戶端路由恢復工具
 * 用於處理 SPA 部署中的深層連結問題
 */

import { isValidRoute } from '../config/routes';

/**
 * 檢查當前 URL 是否為有效的應用路由
 * @param {string} pathname - 當前路徑
 * @returns {boolean} 是否為有效路由
 */
export const isValidAppRoute = (pathname) => {
  return isValidRoute(pathname);
};

/**
 * 嘗試恢復路由
 * @param {string} pathname - 當前路徑
 * @param {function} navigate - React Router navigate 函數
 * @returns {boolean} 是否成功恢復
 */
export const attemptRouteRecovery = (pathname, navigate) => {
  console.log('Attempting route recovery for:', pathname);
  
  // 如果是有效路由，嘗試重新導航
  if (isValidAppRoute(pathname)) {
    console.log('Valid route detected, attempting recovery');
    navigate(pathname, { replace: true });
    return true;
  }
  
  // 如果是無效的 watch 路由，導向首頁
  if (pathname.startsWith('/watch/')) {
    console.log('Invalid watch route, redirecting to home');
    navigate('/', { replace: true });
    return true;
  }
  
  // 其他無效路由，顯示 404
  return false;
};

/**
 * 檢查頁面是否正確載入
 * @returns {boolean} 頁面是否載入完成
 */
export const isPageLoaded = () => {
  // 檢查 React Router 是否已載入
  const mainElement = document.querySelector('main[data-react-router-loaded]');
  if (!mainElement) {
    return false;
  }
  
  // 檢查是否有內容
  const routes = mainElement.querySelector('[data-testid="routes"], .MuiContainer-root, .page-content');
  return !!routes;
};

/**
 * 處理 OAuth 回調路由
 * @param {object} location - React Router location 物件
 * @param {function} navigate - React Router navigate 函數
 */
export const handleOAuthCallback = (location, navigate) => {
  const { pathname, hash, search } = location;
  
  if (pathname === '/auth/google/callback') {
    // 如果有 hash 參數（隱式流程），讓組件處理
    if (hash) {
      console.log('OAuth callback with hash parameters detected');
      return;
    }
    
    // 如果有 search 參數（授權碼流程），讓組件處理
    if (search) {
      console.log('OAuth callback with search parameters detected');
      return;
    }
    
    // 如果沒有參數，可能是直接訪問，重定向到首頁
    console.log('OAuth callback without parameters, redirecting to home');
    navigate('/', { replace: true });
  }
};

/**
 * 設置路由恢復監聽器
 * @param {function} navigate - React Router navigate 函數
 */
export const setupRouteRecovery = (navigate) => {
  // 監聽 popstate 事件（瀏覽器前進/後退）
  const handlePopState = (event) => {
    const currentPath = window.location.pathname;
    
    // 延遲檢查，確保 React Router 有時間處理
    setTimeout(() => {
      if (!isPageLoaded() && isValidAppRoute(currentPath)) {
        console.log('Route recovery triggered by popstate');
        attemptRouteRecovery(currentPath, navigate);
      }
    }, 100);
  };
  
  window.addEventListener('popstate', handlePopState);
  
  // 返回清理函數
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};

/**
 * 檢查並修復靜態資源路徑問題
 */
export const checkStaticAssets = () => {
  // 檢查 CSS 是否正確載入
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  let hasLoadingErrors = false;
  
  stylesheets.forEach(link => {
    if (link.href.includes('undefined') || link.href.includes('null')) {
      console.warn('Detected invalid stylesheet URL:', link.href);
      hasLoadingErrors = true;
    }
  });
  
  // 檢查 JavaScript 是否正確載入
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    if (script.src.includes('undefined') || script.src.includes('null')) {
      console.warn('Detected invalid script URL:', script.src);
      hasLoadingErrors = true;
    }
  });
  
  if (hasLoadingErrors) {
    console.warn('Static asset loading errors detected. This may cause white screen issues.');
    return false;
  }
  
  return true;
};