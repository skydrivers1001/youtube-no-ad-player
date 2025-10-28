import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import telemetry from './utils/telemetry';

// 將 store 暴露到全局，以便 authService.js 可以訪問
window.store = store;

// 初始化前端遙測（Render 生產環境重點觀察）
telemetry.init({
  env: process.env.NODE_ENV,
  release: process.env.REACT_APP_BUILD_ID || process.env.REACT_APP_VERSION || 'unknown',
  endpoint: process.env.REACT_APP_LOG_ENDPOINT || null,
});
telemetry.captureGlobalErrors();
window.telemetry = telemetry;

// 在開發環境中忽略跨來源的 "Script error."，避免第三方腳本（如 YouTube Iframe API）
// 造成的錯誤覆蓋層閃現，真正的應用錯誤仍會顯示
if (process.env.NODE_ENV === 'development') {
  const ignoreScriptErrorEvent = (event) => {
    if (event?.message === 'Script error.' && (!event.filename || event.filename === '')) {
      event.preventDefault?.();
      return true;
    }
  };
  window.addEventListener('error', ignoreScriptErrorEvent, true);
  window.onerror = function (message, source) {
    if (message === 'Script error.' && (!source || source === '')) {
      // 返回 true 可阻止預設處理（舊版瀏覽器行為），配合上方 addEventListener 保險
      return true;
    }
  };
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    if (reason && reason.message === 'Script error.') {
      event.preventDefault?.();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals((metric) => {
  telemetry.logEvent('web_vitals', metric);
});
