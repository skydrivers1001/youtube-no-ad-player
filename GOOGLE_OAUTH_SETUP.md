# Google OAuth 設定指南

## 問題描述
如果您在使用 Google 帳號登入時遇到 "quest failed with status code 401" 錯誤，請按照以下步驟進行設定。

## 解決步驟

### 1. 設定環境變數

1. 複製 `.env.example` 文件並重命名為 `.env.local`
2. 在 `.env.local` 文件中設定您的 Google Client ID：

```
REACT_APP_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
REACT_APP_YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 2. Google Cloud Console 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案或創建新專案
3. 啟用以下 API：
   - YouTube Data API v3
   - Google+ API（用於用戶資訊）

4. 創建 OAuth 2.0 客戶端 ID：
   - 前往「憑證」頁面
   - 點擊「建立憑證」→「OAuth 客戶端 ID」
   - 選擇「網頁應用程式」
   - 設定授權的 JavaScript 來源：
     ```
     http://localhost:3000
     ```
   - 設定授權的重新導向 URI：
     ```
     http://localhost:3000/auth/google/callback
     ```
   - 如果部署到生產環境，也要添加生產環境的 URI

### 3. 重要注意事項

- **使用隱式授權流程**：前端應用程式使用隱式授權流程（Implicit Grant），直接獲取 access token
- **不需要客戶端密鑰**：隱式流程不需要客戶端密鑰，更適合前端應用
- **檢查應用程式狀態**：確保您的 OAuth 應用程式狀態為「已發布」或「測試中」
- **重新啟動開發伺服器**：修改環境變數後需要重新啟動開發伺服器

### 4. 測試步驟

1. 重新啟動開發伺服器：`npm start`
2. 前往設定頁面
3. 點擊「使用 Google 帳號登入」
4. 完成 Google 授權流程

### 5. 常見問題排除

- **401 錯誤**：檢查 Client ID 是否正確，重新導向 URI 是否匹配
- **400 錯誤**：檢查請求參數，確保授權碼有效
- **網路錯誤**：檢查網路連線和防火牆設定

## 安全性說明

此應用程式使用隱式授權流程（Implicit Grant）進行 OAuth 認證：

- **不需要客戶端密鑰**：隱式流程專為前端應用設計，不需要保護客戶端密鑰
- **直接獲取 access token**：避免了授權碼交換步驟，減少了出錯的可能性
- **適合單頁應用**：隱式流程是 SPA（Single Page Application）的標準做法
- **token 存儲在本地**：access token 僅存儲在瀏覽器本地存儲中，不會傳送到後端