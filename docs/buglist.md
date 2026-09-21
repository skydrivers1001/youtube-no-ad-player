# Bug List

This document records known bugs and their resolutions for future reference.

---

## BUG-001: Player Page flicker/reload (development)

- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`

### Symptoms
- Entering PlayerPage, the page appears to flicker or reload periodically.
- Dev server compiles with warnings; at one point, a Babel parser error occurred and triggered repeated rebuilds.

### Root Cause
1) Frequent Redux updates from `VideoPlayer`:
   - A `setInterval` fired every 1s to dispatch `updateVideoProgress`, causing frequent Redux state updates and app-wide re-renders.
   - Another `setInterval` handled data usage tracking and could dispatch `recordDataUsage`, also contributing to re-renders.
2) Temporary syntax error:
   - An incomplete comment block change around line ~113 in `VideoPlayer.js` produced a parser error ("Missing semicolon"), causing hot reload loops.

### Investigation Notes
- Searched the codebase for `setInterval`/`setTimeout` to find sources of frequent updates.
- Verified `useSleepTimer` is defined but not used; not a cause.
- Reviewed `TrafficDisplay` and `statisticsService`—no timers triggering frequent updates there.
- Disabled RouteGuard route-recovery logic to isolate routing-related reloads.
- Watched dev server logs to catch the Babel parsing error and fix it.

### Fix Implemented
- Commented out the per-second progress update interval in `VideoPlayer`.
- Commented out the data-usage tracking interval in `VideoPlayer`.
- Fixed the syntax error by properly closing the commented code block.
- Kept route-recovery logic disabled while verifying stability.

### Validation
- Webpack compiles successfully (only ESLint warnings remain for unused vars).
- Preview at http://localhost:3001/ shows no flicker on Home and PlayerPage.

### Future Hardening / Recommendations
- Throttle/debounce Redux updates from the player:
  - Dispatch progress every 10–15s, and on events: pause, seek end, unload, or when passing 5% progress increments.
  - For data usage, accumulate in component state and dispatch every 30–60s or on a clear threshold, not every second.
- Ensure all intervals are guarded by refs and cleared on pause/unmount.
- Consider feature flags for experimental tracking features.
- Use `useSelector` with shallow equality and memoization to limit re-renders.
- Add a regression checklist for flicker issues (search intervals, verify timers cleared, ensure no rapid dispatch loops).

---

## Template for new bug entries

- ID: BUG-YYYYMMDD-XX
- Title:
- Status: [Open | In Progress | Fixed]
- Affected route(s):
- Affected component(s):
- Symptoms:
- Root Cause:
- Investigation Notes:
- Fix:
- Validation:
- Follow-ups:

---

## BUG-002: formatDuration function error

- Status: Fixed
- Affected route(s): All routes displaying video durations
- Affected component(s): `src/services/youtubeService.js`

### Symptoms
- "API Error! Status: Unknown Message: Cannot read properties of null (reading '1') Fallback to mock data" message displayed on the page.
- Video durations were not displayed correctly or caused errors.

### Root Cause
- The `formatDuration` function in `youtubeService.js` did not handle cases where the `isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)` regular expression returned `null`.
- Directly accessing `match[1]` when `match` was `null` led to the `Cannot read properties of null (reading '1')` error.

### Investigation Notes
- Reviewed the `formatDuration` function and identified the lack of null checks for the regex match result.
- Confirmed that `isoDuration` values could sometimes lead to no match.

### Fix Implemented
- Added a check for `isoDuration` being a valid string before attempting regex matching.
- Added a null check for the `match` variable after the regex execution.
- If `match` is null or `isoDuration` is invalid, the function now returns `'0:00'` to prevent errors.
- Removed all temporary debug code (console logs, UI hints) added during the debugging process.

### Validation
- The "API Error!" message no longer appears on the page.
- Video durations are displayed correctly without errors.
- The application functions as expected after the fix.

### Future Hardening / Recommendations
- Implement more robust input validation for `isoDuration`.
- Consider using a dedicated library for ISO 8601 duration parsing if complex duration formats are expected.
- Add unit tests for `formatDuration` to cover edge cases, including invalid input and non-matching ISO durations.


## BUG-003: Render 部署下深層路由（/debug）顯示不到

- Status: Fixed
- Affected route(s): `/debug`、以及其他深層連結（如 `/watch/...`）
- Affected component(s): `public/404.html`, `public/index.html`, `render.yaml`

### Symptoms
- 在 Render 部署上，直接訪問 `/debug` 可能出現 404 或僅顯示「Redirecting...」，頁面無法載入。

### Root Cause
- 靜態主機未正確配置 SPA rewrite（`/* → /index.html`），深層路由被當成實體檔案路徑請求。
- 專案中的 `404.html` 早期僅在 GitHub Pages 域名啟用 404 回寫，Render 未啟用前端兜底，導致直訪深層路徑拿到 404。

### Fix Implemented
- 在 `render.yaml` 中加入 rewrite 規則：`source: /*`、`destination: /index.html`，`type: rewrite`。
- 在 `public/404.html` 新增 Render 域名兜底回退：將 404 重導到 `/index.html?/<原始路徑>`（以 query 方式攜帶原始路徑）。
- 依賴 `public/index.html` 內的路由解碼腳本，將 `?/<path>` 還原為原始 SPA 路徑（例如 `/debug`）。
- 暫時禁用 Service Worker 註冊以排查頁面閃爍，避免快取導致導覽異常干擾驗證。

### Validation
- 在 `https://<service>.onrender.com/debug` 可正常顯示 DebugLogsPage 的環境資訊與事件紀錄。
- 首次載入首頁 FCP/TTFB 落於靜態站常見區間；後續 SPA 導覽可能出現 `TTFB: 0`（表示走快取/內部導覽）。

### Follow-ups
- 以伺服器端 rewrite 為主；保留 404 前端兜底以防配置漂移或環境差異。
- 待頁面閃爍問題確認解決後，再重新啟用 Service Worker 註冊並重新驗證深層路由與快取行為。

---

## BUG-004: 分享連結開啟後只顯示「影片 / 頻道」

- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `public/404.html`, `public/index.html`, `src/pages/PlayerPage.js`, `src/services/youtubeService.js`

### Symptoms
- 透過外部分享連結或深層連結直接開啟播放器頁時，頁面標題只顯示預設值 `影片`，副標題只顯示 `頻道`。
- 在部分情況下，查詢參數會被錯誤併入路徑，造成標題與影片 ID 解析異常。
- 即使影片本身可播放，頁面上的影片名稱仍未顯示真實標題。

### Root Cause
- Render 的 404 回退腳本在保留深層連結查詢參數時，未正確區分原始路徑與多個 query 參數，導致 `title`、`channel`、`openExternalBrowser` 等資料在還原 URL 時可能混入路徑。
- `PlayerPage` 在 URL 沒有帶入有效 `title/channel` 時，雖然會嘗試呼叫 `getVideoDetails()` 補抓資料，但原本 fallback 只依賴 YouTube Data API 與本地 mock 資料：
  - 若 API key 不可用、配額不足，或影片不在 mock 清單中，就會退回預設的 `影片 / 頻道`。

### Investigation Notes
- 從播放器頁檢查 `videoTitle` 與 `channelName` 的來源，確認目前優先取自 `location.search`。
- 比對分享連結與 Render 深層路由兜底流程，發現 `404.html` 與 `index.html` 的 query/path 還原邏輯會影響 `videoId` 與標題參數解析。
- 檢查 `youtubeService.getVideoDetails()` 後確認：當 YouTube Data API 失敗時，只會回退到本地 mock，無法覆蓋大多數真實影片。

### Fix Implemented
- 修正 `public/404.html` 的 Render 回退腳本，將多個 query 參數安全保留下來，避免與原始路徑混淆。
- 修正 `public/index.html` 的 URL 還原腳本，將回退後的內容重新拆分為正確的 `pathname` 與 `search`。
- 在 `src/pages/PlayerPage.js` 中補強標題來源順序：
  - 先使用 URL 中有效的 `title/channel`
  - 若缺少，則改用本機 `recentlyPlayed` / `watchHistory`
  - 再不夠時才向服務層補抓影片資訊
- 在 `src/services/youtubeService.js` 中擴充 `getVideoDetails()`：
  - 先呼叫 YouTube Data API
  - 若失敗，再使用 YouTube `oEmbed` 取得公開影片標題與頻道名稱
  - 最後才退回本地 mock 資料

### Validation
- 直接透過站外分享連結進入 `/watch/:videoId` 時，可正確顯示影片實際標題與頻道名稱。
- `npm run build` 已通過，確認修正未破壞既有建置流程。

### Follow-ups
- 若未來仍需支援更多分享來源，可考慮在後端或 Edge 層預先解析並注入標題資訊，降低前端對第三方 API 可用性的依賴。
- 可補上針對深層連結與 metadata fallback 的自動化測試，避免之後再出現只顯示 `影片 / 頻道` 的回歸問題。

---

## BUG-005: 畫中畫與背景切換後播放器音訊狀態異常

- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`

### Symptoms
- 影片進入畫中畫、離開畫中畫，或在背景播放與回到前景之間切換後，播放器可能出現靜音狀態與 UI 顯示不一致的情況。
- 某些情境下畫面仍在播放，但音量、靜音狀態或自動播放行為沒有正確恢復。

### Root Cause
- 畫中畫切換與背景可見度切換後，播放器沒有完整回寫先前的音量與靜音狀態。
- `autoplay` 的初始條件與播放器重新初始化流程耦合，導致某些切換情境下重新掛載後行為不穩定。
- 音量控制邏輯只更新數值，未同步處理 `mute/unMute` 狀態，造成實際播放器狀態與 React state 漂移。

### Investigation Notes
- 檢查 `VideoPlayer` 中畫中畫的 `onEnter/onExit` callback，確認離開小窗時只有 seek/play，未完整恢復音訊狀態。
- 檢查 `visibilitychange` 與播放器 `ready` 流程，確認回前景後沒有穩定套用預期的音量與靜音設定。
- 比對音量滑桿與靜音切換邏輯後，發現 UI 狀態與 YouTube player instance 的實際狀態可能不同步。

### Fix Implemented
- 抽出穩定的畫中畫 callback，讓進出小窗時能保留播放位置並正確恢復音量與靜音狀態。
- 在播放器 `ready` 階段補上 `mute/unMute` 同步，避免重新建立播放器後狀態遺失。
- 在背景切回前景時，重新套用預期的音量與取消靜音。
- 補強音量滑桿處理：調整為正規化後的值，並在 `0` 與非 `0` 間同步切換 `mute/unMute`。
- 固定初始自動播放判斷，避免播放器重建時被重新計算造成行為跳動。

### Validation
- 進入與離開畫中畫後，播放器可保持正確的音訊狀態。
- 背景播放切回前景後，音量與靜音狀態可與 UI 保持一致。

### Follow-ups
- 可補上畫中畫與背景切換的互動測試，驗證播放器狀態、音量與播放位置都能正確延續。

---

## BUG-006: 首頁「查看歷史 / 查看全部」導向後內容為空

- Status: Fixed
- Affected route(s): `/`, `/playlists?view=history`, `/playlists?view=recent`
- Affected component(s): `src/pages/HomePage.js`, `src/pages/PlaylistsPage.js`

### Symptoms
- 首頁「繼續觀看」區塊的 `查看歷史` 與「最近播放」區塊的 `查看全部` 點進去後，看不到對應內容。
- 使用者會被導到播放清單頁，但看到的是一般播放清單，而不是已經有資料的歷史或最近播放列表。

### Root Cause
- 首頁兩個入口都只導向 `/playlists`，沒有把要顯示的視圖模式帶過去。
- `PlaylistsPage` 原本只支援一般播放清單與觀看歷史切換，沒有針對最近播放建立獨立視圖。

### Investigation Notes
- 從首頁按鈕追到 `navigate` / `Link` 目標，確認兩個入口都落在同一路徑，未攜帶任何狀態。
- 檢查 `PlaylistsPage` 的顯示條件後，確認缺少依 query 切換到 `history` / `recent` 的邏輯。

### Fix Implemented
- 將首頁「查看歷史」改為導向 `/playlists?view=history`。
- 將首頁「查看全部」改為導向 `/playlists?view=recent`。
- 在 `PlaylistsPage` 中加入 `useSearchParams`，依 `view` 參數切換顯示觀看歷史或最近播放。
- 補上最近播放的獨立列表畫面與標題，並提供返回一般播放清單的入口。

### Validation
- 從首頁點入 `查看歷史` 可正確顯示觀看歷史內容。
- 從首頁點入 `查看全部` 可正確顯示最近播放內容。

### Follow-ups
- 可考慮補上直接重新整理 `/playlists?view=history` 與 `/playlists?view=recent` 的路由測試，避免 query 視圖回歸。

---

## BUG-007: 觀看歷史與最近播放無法單筆刪除

- Status: Fixed
- Affected route(s): `/playlists?view=history`, `/playlists?view=recent`
- Affected component(s): `src/pages/PlaylistsPage.js`, `src/store/playlistsSlice.js`

### Symptoms
- 使用者可以清空整個觀看歷史，但無法只刪除單一筆觀看歷史或最近播放項目。
- 最近播放列表也缺少逐筆管理能力，操作彈性不足。

### Root Cause
- Redux store 只提供整體清除或新增資料的 reducer，未提供單筆刪除 `recentlyPlayed` / `watchHistory` 的 action。
- `PlaylistsPage` 的卡片列表沒有對應的刪除按鈕與事件處理。

### Investigation Notes
- 檢查 `playlistsSlice` 後確認缺少 `removeRecentlyPlayed` 與 `removeWatchHistoryItem`。
- 檢查 `PlaylistsPage` 列表 UI，確認最近播放與觀看歷史卡片僅能點擊進入播放，沒有刪除入口。

### Fix Implemented
- 在 `playlistsSlice` 中新增 `removeRecentlyPlayed` 與 `removeWatchHistoryItem` reducer。
- 在 `PlaylistsPage` 的最近播放與觀看歷史卡片下方加入單筆 `刪除` 按鈕。
- 觀看歷史刪除邏輯支援以 `id + watchedAt` 精準移除單筆紀錄，避免同影片多次觀看時誤刪。

### Validation
- 最近播放可逐筆刪除指定影片。
- 觀看歷史可逐筆移除單一紀錄，不影響其他同影片紀錄。

### Follow-ups
- 若後續要支援批次勾選刪除，可再往上擴充列表管理模式。

---

## BUG-008: 手機播放器控制列遮擋影片且自訂控制與原生控制衝突

- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`, `src/pages/SettingsPage.js`, `src/store/settingsSlice.js`

### Symptoms
- 手機版播放器的自訂控制列一度遮住影片畫面，影響觀看與點擊體驗。
- 觸控手勢層會和 YouTube 原生控制打架，導致 seek、播放、全螢幕等操作不好點。
- 行動裝置上同時出現重複的自訂進度條與原生進度條，UI 顯得混亂。
- 自訂全螢幕按鈕在部分手機瀏覽器支援不穩，會出現不支援或行為不一致的情況。

### Root Cause
- 自訂的手機控制列與手勢覆蓋層直接疊在影片區上方，沒有為 normal mode 預留足夠顯示空間。
- 專案同時依賴自訂觸控控制與 YouTube 原生 mobile controls，兩套互動在行動裝置上發生衝突。
- 手機瀏覽器對網頁 Fullscreen API 與 YouTube iframe 互動支援不一致，自訂全螢幕方案穩定性不足。

### Investigation Notes
- 根據近期多個修正 commit 比對，問題並非單一 bug，而是由控制列布局、手勢覆蓋、進度條重複與全螢幕策略共同造成。
- 檢查 `VideoPlayer` 後確認，手機端曾同時存在：
  - 自訂 transport bar
  - 自訂手勢覆蓋層
  - 自訂全螢幕按鈕
  - YouTube 原生控制
- 多次調整後，最終方向改為讓手機端更多依賴 YouTube 原生控制，並把自訂能力收斂成不干擾播放的模式。

### Fix Implemented
- 恢復並重新整理手機播放器必要控制，讓基本播放、seek 與操作維持可用。
- 將觸控手勢改為預設關閉，並新增設定開關，只有使用者手動啟用時才套用。
- 將手機控制列重新融合回播放器表面，避免畫面與控制列割裂。
- 在 normal mode 為手機 / 平板控制列預留顯示空間，避免控制項遮住影片。
- 移除重複的自訂進度條，保留 YouTube 原生進度條。
- 手機端不再顯示自訂全螢幕按鈕，改依賴 YouTube 原生全螢幕機制。

### Validation
- 手機版播放器不再被控制列覆蓋主要畫面。
- seek、播放與全螢幕操作可透過原生控制正常使用。
- 手勢功能預設不再干擾原生控制，只有在設定中開啟時才生效。

### Follow-ups
- 可補上手機瀏覽器的互動回歸測試，特別是 iOS Safari 與 Android Chrome 的播放控制與全螢幕行為。
- 若之後再擴充自訂手勢，建議維持 opt-in 策略，避免重新干擾原生控制。
