# YouTube 無廣告播放器

這是一個專為提供無干擾YouTube觀看體驗而設計的React應用程式。它提供了簡潔的界面，移除了廣告、推薦內容和其他分心元素，讓用戶專注於觀看影片內容。

## 核心功能

### 影片播放
- 無廣告播放YouTube影片
- 自定義播放控制（播放/暫停、音量、靜音、播放進度、全螢幕切換）
- 支援播放速度調整（0.25x - 2x）
- 支援字幕顯示與語言選擇

### 界面簡化
- 無推薦影片干擾
- 無留言區
- 無側邊欄
- 專注於影片內容的簡潔設計

### 播放清單與收藏
- 創建和管理自定義播放清單
- 收藏喜愛的影片
- 查看觀看歷史
- 最近播放記錄

### 搜尋功能
- 搜尋YouTube影片
- 搜尋頻道
- 搜尋播放清單
- 過濾搜尋結果（影片長度、上傳時間）

### 個人化設置
- 深色/淺色模式切換
- 預設播放速度設置
- 預設字幕語言設置
- 自動播放設置
- 背景播放選項

### 便利功能
- 畫中畫模式
- 睡眠定時器
- 快捷鍵支援

## 技術架構

本應用程式使用以下技術構建：

- **React** - 用戶界面構建
- **Redux** - 狀態管理
- **React Router** - 路由管理
- **Material-UI** - UI組件庫
- **React YouTube** - YouTube播放器整合
- **Axios** - API請求處理

## 使用指南

### 安裝與運行

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm start
```

應用將在 [http://localhost:3000](http://localhost:3000) 運行。

### 構建生產版本

```bash
npm run build
```

## 注意事項

本應用僅供學習和個人使用，請遵守YouTube的服務條款。應用不會下載或存儲任何YouTube內容，僅提供更簡潔的觀看界面。

## 部署到 Render（Static Site）

- 伺服器端 Rewrite（首選）
  - 在 `render.yaml` 設定：
    - `type: static_site`
    - `buildCommand: ./render-build.sh`
    - `publishPath: build`
    - `routes`：新增 `type: rewrite`，`source: /*`，`destination: /index.html`
  - 若服務不是 Blueprint 方式建立，請在 Render 控制台的 Redirects/Rewrites 手動添加同樣的 rewrite。

- 404 前端兜底（容錯）
  - `public/404.html` 會在 `*.onrender.com` 域名下把 404 路由重導至 `/index.html?/<path>`。
  - `public/index.html` 內的解碼腳本會將 `?/<path>` 還原為 SPA 路徑（例如 `/debug`）。
  - 伺服器 rewrite 與前端兜底不衝突；建議兩者都保留以提升穩健性。

- 部署後驗證
  - 直接訪問 `/debug` 應可正常顯示環境資訊與事件記錄。
  - 常見效能指標：首頁 FCP 約 1–2s、TTFB 約 200–300ms；SPA 內部導覽可能看到 `TTFB: 0`（快取/軟導覽）。

- Service Worker
  - 目前為排查頁面閃爍暫停註冊，如需啟用，解除 `public/index.html` 中註冊程式的註解並部署。
  - 啟用後請再次驗證深層路由與快取行為，確保不影響 SPA 導覽。
