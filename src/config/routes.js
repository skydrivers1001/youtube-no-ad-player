/**
 * 路由配置檔案
 * 集中管理應用程式的所有路由定義和相關邏輯
 */

// 應用程式路由定義
export const APP_ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  WATCH: '/watch/:videoId',
  PLAYLISTS: '/playlists',
  SETTINGS: '/settings',
  OAUTH_CALLBACK: '/auth/google/callback'
};

// 路由路徑列表（用於驗證）
export const ROUTE_PATHS = Object.values(APP_ROUTES);

// 精確匹配的路由
export const EXACT_ROUTES = [
  APP_ROUTES.HOME,
  APP_ROUTES.SEARCH,
  APP_ROUTES.PLAYLISTS,
  APP_ROUTES.SETTINGS,
  APP_ROUTES.OAUTH_CALLBACK
];

// 動態路由模式
export const DYNAMIC_ROUTES = {
  WATCH: {
    pattern: /^\/watch\/([a-zA-Z0-9_-]{11})$/,
    template: APP_ROUTES.WATCH,
    paramName: 'videoId'
  }
};

// 路由元數據
export const ROUTE_META = {
  [APP_ROUTES.HOME]: {
    title: 'YouTube No AD Player',
    description: '無廣告 YouTube 播放器首頁',
    requiresAuth: false,
    preload: true
  },
  [APP_ROUTES.SEARCH]: {
    title: '搜尋 - YouTube No AD Player',
    description: '搜尋 YouTube 影片',
    requiresAuth: false,
    preload: false
  },
  [APP_ROUTES.WATCH]: {
    title: '播放影片 - YouTube No AD Player',
    description: '觀看 YouTube 影片',
    requiresAuth: false,
    preload: false
  },
  [APP_ROUTES.PLAYLISTS]: {
    title: '播放清單 - YouTube No AD Player',
    description: '管理您的 YouTube 播放清單',
    requiresAuth: true,
    preload: false
  },
  [APP_ROUTES.SETTINGS]: {
    title: '設定 - YouTube No AD Player',
    description: '應用程式設定',
    requiresAuth: false,
    preload: false
  },
  [APP_ROUTES.OAUTH_CALLBACK]: {
    title: '登入中 - YouTube No AD Player',
    description: 'Google OAuth 登入回調',
    requiresAuth: false,
    preload: false
  }
};

/**
 * 檢查路徑是否為有效的應用路由
 * @param {string} pathname - 要檢查的路徑
 * @returns {boolean} 是否為有效路由
 */
export const isValidRoute = (pathname) => {
  // 檢查精確匹配
  if (EXACT_ROUTES.includes(pathname)) {
    return true;
  }
  
  // 檢查動態路由
  for (const route of Object.values(DYNAMIC_ROUTES)) {
    if (route.pattern.test(pathname)) {
      return true;
    }
  }
  
  return false;
};

/**
 * 獲取路由的元數據
 * @param {string} pathname - 路由路徑
 * @returns {object|null} 路由元數據
 */
export const getRouteMeta = (pathname) => {
  // 精確匹配
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname];
  }
  
  // 動態路由匹配
  for (const [key, route] of Object.entries(DYNAMIC_ROUTES)) {
    if (route.pattern.test(pathname)) {
      return ROUTE_META[route.template];
    }
  }
  
  return null;
};

/**
 * 解析動態路由參數
 * @param {string} pathname - 路由路徑
 * @returns {object} 路由參數
 */
export const parseRouteParams = (pathname) => {
  const params = {};
  
  for (const [key, route] of Object.entries(DYNAMIC_ROUTES)) {
    const match = pathname.match(route.pattern);
    if (match) {
      params[route.paramName] = match[1];
      params._routeType = key;
      break;
    }
  }
  
  return params;
};

/**
 * 生成路由路徑
 * @param {string} routeKey - 路由鍵值
 * @param {object} params - 路由參數
 * @returns {string} 生成的路徑
 */
export const generatePath = (routeKey, params = {}) => {
  const route = APP_ROUTES[routeKey];
  if (!route) {
    throw new Error(`Unknown route: ${routeKey}`);
  }
  
  let path = route;
  
  // 替換動態參數
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  
  return path;
};

/**
 * 檢查路由是否需要認證
 * @param {string} pathname - 路由路徑
 * @returns {boolean} 是否需要認證
 */
export const requiresAuth = (pathname) => {
  const meta = getRouteMeta(pathname);
  return meta ? meta.requiresAuth : false;
};

/**
 * 獲取路由標題
 * @param {string} pathname - 路由路徑
 * @param {object} params - 路由參數（可選）
 * @returns {string} 路由標題
 */
export const getRouteTitle = (pathname, params = {}) => {
  const meta = getRouteMeta(pathname);
  if (!meta) {
    return 'YouTube No AD Player';
  }
  
  let title = meta.title;
  
  // 如果是動態路由，可以根據參數自定義標題
  if (params.videoId && pathname.startsWith('/watch/')) {
    title = `播放影片 - YouTube No AD Player`;
  }
  
  return title;
};

/**
 * 路由導航輔助函數
 */
export const navigationHelpers = {
  /**
   * 導航到首頁
   */
  goHome: () => APP_ROUTES.HOME,
  
  /**
   * 導航到搜尋頁
   * @param {string} query - 搜尋查詢
   */
  goSearch: (query = '') => {
    const searchParams = query ? `?q=${encodeURIComponent(query)}` : '';
    return `${APP_ROUTES.SEARCH}${searchParams}`;
  },
  
  /**
   * 導航到影片播放頁
   * @param {string} videoId - 影片 ID
   */
  goWatch: (videoId) => {
    if (!videoId) {
      throw new Error('Video ID is required');
    }
    return generatePath('WATCH', { videoId });
  },
  
  /**
   * 導航到播放清單頁
   */
  goPlaylists: () => APP_ROUTES.PLAYLISTS,
  
  /**
   * 導航到設定頁
   */
  goSettings: () => APP_ROUTES.SETTINGS
};

export default {
  APP_ROUTES,
  ROUTE_PATHS,
  EXACT_ROUTES,
  DYNAMIC_ROUTES,
  ROUTE_META,
  isValidRoute,
  getRouteMeta,
  parseRouteParams,
  generatePath,
  requiresAuth,
  getRouteTitle,
  navigationHelpers
};