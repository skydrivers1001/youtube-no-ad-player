// Simple service worker for PWA install + SPA routing.
// V1 intentionally keeps caching minimal so Android install and /share
// entry can work without stale bundle issues.

const SPA_FALLBACK = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || request.method !== 'GET') {
    return;
  }

  // Only intercept HTML navigation requests; let static assets use the
  // default network path for V1.
  if (request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          return response;
        }

        // Unknown deep links (including /share with query params) should
        // fall back to the SPA entry so React Router can handle them.
        return fetch(SPA_FALLBACK);
      })
      .catch(() => fetch(SPA_FALLBACK))
  );
});
