// Service Worker for SPA routing support
// 處理客戶端路由和靜態資源快取

const CACHE_NAME = 'youtube-no-ad-v1';
const STATIC_CACHE = 'static-v1';

// 需要快取的靜態資源
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// 應用路由列表
const APP_ROUTES = [
  '/',
  '/search',
  '/playlists',
  '/settings',
  '/auth/google/callback'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/'));
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  
  // 強制啟用新的 Service Worker
  self.skipWaiting();
});

// 啟用 Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 立即控制所有頁面
  self.clients.claim();
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只處理同源請求
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // 處理導航請求（HTML 頁面）
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // 處理靜態資源請求
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
  
  // 其他請求直接通過網路
  event.respondWith(fetch(request));
});

// 處理導航請求（SPA 路由）
async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // 首先嘗試從網路獲取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 如果網路請求成功，快取並返回
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Network request failed, trying cache or fallback:', error);
  }
  
  // 網路請求失敗，檢查是否是應用路由
  if (isAppRoute(pathname)) {
    console.log('Serving SPA fallback for route:', pathname);
    return serveSPAFallback();
  }
  
  // 嘗試從快取獲取
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 如果都失敗了，返回 SPA fallback
  return serveSPAFallback();
}

// 處理靜態資源請求
async function handleStaticAssetRequest(request) {
  try {
    // 首先檢查快取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 從網路獲取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 快取成功的響應
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url, error);
    
    // 嘗試從快取獲取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回錯誤響應
    return new Response('Asset not found', { status: 404 });
  }
}

// 檢查是否是應用路由
function isAppRoute(pathname) {
  // 檢查精確匹配
  if (APP_ROUTES.includes(pathname)) {
    return true;
  }
  
  // 檢查 /watch/:videoId 路由
  if (pathname.startsWith('/watch/')) {
    const videoIdMatch = pathname.match(/^\/watch\/([a-zA-Z0-9_-]{11})$/);
    return !!videoIdMatch;
  }
  
  return false;
}

// 提供 SPA fallback（返回 index.html）
async function serveSPAFallback() {
  try {
    // 嘗試從快取獲取 index.html
    const cache = await caches.open(CACHE_NAME);
    const cachedIndex = await cache.match('/');
    
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // 從網路獲取 index.html
    const indexResponse = await fetch('/');
    
    if (indexResponse.ok) {
      // 快取 index.html
      cache.put('/', indexResponse.clone());
      return indexResponse;
    }
  } catch (error) {
    console.error('Failed to serve SPA fallback:', error);
  }
  
  // 如果都失敗了，返回基本的 HTML
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>YouTube No AD Player</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <div id="root">
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <h2>載入中...</h2>
            <p>正在載入 YouTube No AD Player</p>
            <p><a href="/">回到首頁</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    }
  );
}

// 處理訊息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});