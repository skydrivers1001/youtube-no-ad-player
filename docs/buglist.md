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
- `PlayerPage` 在 URL 沒有帶入有效 `title/channel` 時，原本 fallback 只依賴 YouTube Data API 與本地 mock 資料；若 API key 不可用、配額不足，或影片不在 mock 清單中，就會退回預設的 `影片 / 頻道`。
- 後續發現本機 `recentlyPlayed` / `watchHistory` 中已存在的 `影片 / 頻道` placeholder 會被誤認為有效資料，且優先於新抓取的 metadata。
- 播放器載入時又會立即把 placeholder 寫回最近播放與觀看歷史，使錯誤資料持續存在。

### Investigation Notes
- 從播放器頁檢查 `videoTitle` 與 `channelName` 的來源，確認資料可能來自 URL、本機歷史、YouTube API 與播放器本身。
- 比對分享連結與 Render 深層路由兜底流程，發現 `404.html` 與 `index.html` 的 query/path 還原邏輯會影響 `videoId` 與標題參數解析。
- 檢查 `youtubeService.getVideoDetails()` 後確認：當 YouTube Data API 失敗時，只會回退到本地 mock，無法覆蓋大多數真實影片。
- 進一步確認舊快取內的 placeholder 會遮蔽後續取得的真實 metadata，並被重複寫回 Redux store。

### Fix Implemented
- 修正 `public/404.html` 的 Render 回退腳本，將多個 query 參數安全保留下來，避免與原始路徑混淆。
- 修正 `public/index.html` 的 URL 還原腳本，將回退後的內容重新拆分為正確的 `pathname` 與 `search`。
- 在 `src/pages/PlayerPage.js` 中補強 metadata 來源與優先順序：
  - 先使用 URL 中有效的 `title/channel`
  - URL 缺少資料時，優先採用新抓取的 metadata
  - 本機 `recentlyPlayed` / `watchHistory` 僅在內容不是 `影片 / 頻道` placeholder 時才作為 fallback
  - YouTube player ready 後再透過 `getVideoData()` 取得標題與作者，避開 API key、配額或 CORS 限制
- 僅在標題與頻道皆為有效值時寫入最近播放與觀看歷史，避免 placeholder 再次污染快取。
- 在 `src/services/youtubeService.js` 中擴充 `getVideoDetails()`：
  - 先呼叫 YouTube Data API
  - 若失敗，再使用 YouTube `oEmbed` 取得公開影片標題與頻道名稱
  - 最後才退回本地 mock 資料

### Validation
- 直接透過站外分享連結進入 `/watch/:videoId` 時，可正確顯示影片實際標題與頻道名稱。
- 已確認舊快取中的 `影片 / 頻道` 不會覆蓋新取得的真實 metadata，也不會再被寫回歷史。
- `npm run build` 已通過，且本機預覽可正常啟動並回應 HTTP 200。

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

---

## BUG-009: 平板橫放時播放頁影片資訊區塊排版不一致

- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/pages/PlayerPage.js`

### Symptoms
- 在平板橫向（或寬度較大的螢幕）觀看影片時，影片標題與頻道名稱會被縮窄並擠在左側。
- 稍後觀看、加入播放清單等按鈕群會被推到標題區塊的右側，未如同手機版一樣保持上下堆疊。

### Root Cause
- `PlayerPage.js` 裡的影片資訊區塊採用了 `flex-wrap` 與 `space-between`，並讓按鈕列在 `sm` 寬度斷點以上對齊到 `flex-end`。
- 這個響應式設定導致螢幕一旦寬過手機斷點，就會強迫標題與按鈕左右並排，破壞了一致的垂直閱讀動線。

### Fix Implemented
- 移除原本根據寬度斷點決定水平/垂直排列的 RWD 設定。
- 將影片資訊區塊直接改為 `flex-direction: column`。
- 讓標題區塊佔滿寬度（`width: 100%`），而下方按鈕列統一固定靠左對齊（`justifyContent: flex-start`）。

### Validation
- 平板橫放時，影片標題與作者顯示於第一列並佔滿寬度。
- 所有的操作按鈕固定顯示在標題正下方，維持與手機版一致的上下堆疊體驗。

---

## BUG-010: 首頁繼續觀看與最近播放區塊在單一顯示時卡片過大

- Status: Fixed
- Affected route(s): `/`
- Affected component(s): `src/pages/HomePage.js`

### Symptoms
- 首頁的「繼續觀看」與「最近播放」原設計為兩個區塊並排（各佔 50% 寬度）。當使用者只有其中一種紀錄（例如只有最近播放，沒有繼續觀看）時，該區塊會佔滿 100% 寬度。
- 因為內部的影片卡片網格寫死為 `xs={12} sm={6}`，導致佔滿 100% 寬度時，每張影片小卡會被拉大至螢幕的 50% 寬度，版面變得異常巨大。

### Root Cause
- `HomePage.js` 中的外層區塊固定使用 `md={6}` 或在單一區塊時自動佔滿寬度，但內層的卡片 Grid 沒有針對外層區塊的動態寬度做對應的響應式調整。

### Fix Implemented
- 在 `HomePage.js` 中加入了邏輯判斷：當只有單一區塊存在而佔滿全寬 (`md={12}`) 時，將內部小卡的寬度調整為 `md={3}`（一行 4 張小卡）。
- 當兩個區塊並排（外層為 `md={6}`）時，內部小卡維持原本的 `md={6}`（因為相對於半個螢幕的 50%，剛好等於全螢幕的 25%）。
- 確保無論是一邊顯示還是兩邊並排，實體卡片的尺寸在視覺上都保持一致的小卡呈現。

### Validation
- 清空或只有單一播放紀錄時，首頁影片卡片維持正常的 1/4 寬度（電腦版）小卡，不再被不正常放大。
- 當繼續觀看與最近播放同時存在時，兩邊各佔一半，內部同樣維持每排兩張小卡，尺寸不變。

> 後續追蹤：此修復只調整舊版 Grid 欄位比例，未處理 MUI v7 已移除 Legacy Grid 尺寸屬性的根因；完整修復請見 BUG-011。

---

## BUG-011: MUI v7 Legacy Grid 屬性失效造成首頁影片卡片尺寸不一致

- Status: Fixed
- Affected route(s): `/`
- Affected component(s): `src/pages/HomePage.js`

### Symptoms
- 首頁「繼續觀看」與「最近播放」區塊中，同一組影片卡片會混合出現正常小卡與接近整個螢幕寬度的大卡。
- 只有一筆紀錄或只有其中一個區塊時，單張卡片可能被拉滿整列。
- 問題看似受到資料筆數、載入順序或內容影響，但縮圖尺寸與標題長度並非真正原因。
- 先前透過調整 `md` 欄位比例的修復仍會復發。

### Root Cause
- 專案目前使用 MUI v7，但首頁仍以舊版 Grid API 的 `item`、`xs`、`sm`、`md` 屬性控制父層與卡片寬度。
- MUI v7 內部的 Legacy Grid 相容處理會移除這些舊尺寸屬性，導致預期的欄寬 CSS 沒有產生。
- 卡片因此失去父容器統一配置的 track 寬度，在 Flex/Grid 內容計算下依可用空間被不一致地放大。
- BUG-010 所做的 `md={3}` / `md={6}` 調整仍依賴已失效的 Legacy Grid 屬性，所以只能改到表面設定，無法約束實際 computed width。

### Investigation Notes
- 比較正常與異常卡片的 computed style，確認異常卡片沒有預期的固定欄寬，且 `flex-basis` 為 `auto`。
- 檢查父層、卡片、縮圖、標題及進度條後，排除圖片原始比例、文字長度、`:first-child`、`:last-child`、`:nth-child` 與個別卡片樣式造成放大。
- 確認「繼續觀看」與「最近播放」使用相同的卡片規則，問題來源是兩者共同依賴的舊版 MUI Grid 尺寸 API。
- 透過不同 viewport 的實際渲染寬度驗證，確認共同尺寸約束失效才是第一條來源規則。

### Fix Implemented
- 移除兩個首頁歷史區塊使用的 Legacy `<Grid container>` 與 `<Grid item>` 版面。
- 外層區塊改為標準 CSS Grid：手機單欄、桌機雙欄，並以 `minmax(0, 1fr)` 防止內容撐破父層。
- 卡片列表由父層 CSS Grid 統一控制固定 track：
  - 手機：`220px`
  - 平板：`228px`
  - 桌機：`240px`
- 使用 `repeat(auto-fit, <固定寬度>)` 與 `justify-content: flex-start`，確保只有一張卡片時也不會拉滿整列。
- 卡片本身使用 `width: 100%` 填滿父層 track，並設定 `min-width: 0`，寬度不再由內容決定。
- 縮圖容器統一為 `aspect-ratio: 16 / 9`，圖片使用 `width: 100%`、`height: 100%`、`object-fit: cover`、`display: block`。
- 標題統一限制最多兩行並截斷，避免長標題改變卡片寬度。
- 樣式僅定義於 `HomePage.js` 的「繼續觀看」與「最近播放」區塊，不影響播放器、搜尋結果及其他頁面。

### Validation
- 約 390px 手機寬度：卡片維持 220px、縮圖比例 16:9，單張資料不會撐滿整列。
- 約 768px／834px 平板直向：卡片維持 228px，同一區塊內寬度一致且無非預期水平溢出。
- 約 1280px 桌機寬度：卡片維持 240px，兩個區塊並排時仍使用相同尺寸規則。
- 長標題、短標題及不同原始尺寸縮圖均不會改變卡片寬度。
- `npm run build` 編譯成功。

### Follow-ups
- 新增或升級 MUI 元件時，避免繼續使用已棄用的 Legacy Grid `item/xs/sm/md` API。
- 可加入首頁三種 viewport 的視覺回歸測試，覆蓋單張、多張、長標題與不同縮圖尺寸情境。

---

## BUG-012: 桌機播放器控制列按鈕寬度不足導致擠壓重疊

- Date: 2026-10-11
- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`

### Symptoms
- 桌機版在螢幕尺寸適中、視窗非最大化或分屏瀏覽時，播放器底欄的按鈕擠成一團。
- 5 個平鋪倍速按鈕、字幕、循環、畫中畫、全螢幕按鈕與左側的時間文字及音量滑桿互相覆蓋重疊。

### Root Cause
- 原本在控制列右側將 5 個倍速按鈕（`0.5x, 1x, 1.25x, 1.5x, 2x`）全部平鋪展開，佔用了超過 180px 的寬度。
- 外層 Flex 容器為 `gap: 2`，左側區塊與右側區塊未設定最小收縮防護（`minWidth: 0`, `flexShrink`），導致容器寬度不足時右側按鈕群直接侵入左側區塊。

### Fix Implemented
- 將 5 個平鋪的倍速按鈕改為單一倍速切換按鈕，點擊時彈出 Material-UI `Menu` 下拉選單供使用者挑選倍速（支援 0.5x ~ 2x），一次省下逾 150px 橫向空間。
- 容器外層設定 `flexWrap: 'nowrap'`，左側區塊設定 `minWidth: 0, flexShrink: 1`，音量滑桿使用響應式寬度（50px ~ 80px），時間文字設定字級與 `whiteSpace: 'nowrap'`，徹底杜絕組件重疊。

### Validation
- 經不同視窗寬度測試，控制列左右側維持清楚間距，倍速選單點擊展開選擇正常，不再有任何按鈕重疊擠壓情況。
- `npm run build` 通過。

---

## BUG-013: 手機版播放器自訂功能（循環播放、畫中畫）不易存取與可見度不足

- Date: 2026-10-11
- Status: Fixed (待行動端平台能力持續優化)
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`, `src/pages/PlayerPage.js`

### Symptoms
- 手機用戶反映在手機上看影片時看不到新加入的「循環播放」與「畫中畫」功能，無法點擊操作。

### Root Cause
- 手機端螢幕寬度較窄（約 375px ~ 390px），原本在播放器底部的觸控操作條也平鋪了 5 個倍速按鈕，導致單行空間不足發生折行，按鈕被擠出可視範圍或被截斷。
- 行動版 YouTube iframe 原生觸控事件容易與自訂覆蓋層產生互動衝突，手機用戶通常習慣在影片正下方的操作列（稍後觀看、收藏等）進行操作，而非播放器內部細小的按鈕。

### Fix Implemented
- 在 `PlayerPage.js` 的影片資訊操作列（稍後觀看、收藏同排）直接新增【循環播放】與【畫中畫】實體按鈕。
- 在 `VideoPlayer.js` 使用 `forwardRef` 與 `useImperativeHandle` 對外提供 `toggleLoop`、`togglePictureInPicture` 等 API，使外層按鈕能直接操控播放器，並透過受控狀態雙向同步循環開啟狀態。
- 將 `VideoPlayer.js` 手機觸控控制欄重構為緊湊排版，倍速同樣改為下拉選單，按鈕緊湊不折行。

### Validation
- 手機版開啟頁面時，影片標題正下方清晰可見【循環播放】與【畫中畫】按鈕，點擊能正確切換循環狀態並高亮。
- 播放器內部觸控條與外部按鈕狀態即時連動。

### Follow-ups (未盡事宜)
- 行動端瀏覽器（尤其是 iOS Safari）對 `documentPictureInPicture` API 支援度有限，後續需針對不支援的裝置提供清楚的「此裝置瀏覽器不支援」提示或嘗試原生 `<video>` 畫中畫降級方案。

---

## BUG-014: PWA 與手機瀏覽器強烈快取導致程式碼更新無法即時反映

- Date: 2026-10-11
- Status: In Progress (已實施基礎防快取機制，待增強主動提示)
- Affected route(s): All routes
- Affected component(s): `public/index.html`, `public/sw.js`

### Symptoms
- 程式修正推送至伺服器並部署後，手機用戶開啟網頁或 PWA App 依然看到舊版畫面，必須手動多次關閉重開或清除快取。

### Root Cause
- 專案註冊了 PWA Service Worker（`public/sw.js`），且手機瀏覽器（iOS Safari / Android Chrome）對靜態 HTML 檔案有高度磁碟快取（Disk Cache）機制。
- 當使用者直接訪問時，瀏覽器優先讀取快取的 `index.html`，導向舊版本的 JavaScript 資源 bundle。

### Fix Implemented
- 在 `public/index.html` 的 `<head>` 區段加入 `Cache-Control: no-cache, no-store, must-revalidate`、`Pragma: no-cache`、`Expires: 0` 標籤，強制瀏覽器抓取最新 HTML 入口。
- 在 `public/sw.js` 的 `activate` 事件中加入自動清除所有舊 Cache 儲存區的邏輯（`caches.keys().then(...)`）。
- 在 `public/index.html` 的 Service Worker 註冊回呼中加入 `reg.update()`，確保每次載入都主動向伺服器檢查 Service Worker 是否有更新版本。

### Follow-ups (未盡事宜)
- 目前若使用者透過已安裝的 PWA App 開啟，仍依賴 Service Worker 重新啟動生命週期生效。建議後續新增前端版本比對或 Service Worker 更新廣播（BroadcastChannel），當偵測到新版本時在畫面上彈出 Snackbar 提示「發現新版本，點擊立即更新」，大幅提升使用者體驗。

---

## BUG-015: 單部影片網址帶播放清單參數時未能自動連續播放下一部

- Date: 2026-10-11
- Status: Open (未盡事項)
- Affected route(s): `/watch/:videoId?list=:playlistId`
- Affected component(s): `src/pages/PlayerPage.js`, `src/services/youtubeService.js`

### Symptoms
- 使用者從 YouTube 複製特定影片網址（格式如 `https://www.youtube.com/watch?v=xxx&list=PLxxx`）貼入播放時，當前影片播放完畢後，不會自動繼續播放該清單中的下一部影片。

### Root Cause
- 目前系統在處理單一影片網址時，若僅解析出 `videoId`，播放器僅能載入單部影片；雖然 URL 中附帶有 `list` 參數，但前端尚未在背景自動觸發 `getPlaylistVideos` 將整個播放清單下載並組裝成播放佇列（Queue）。
- 當 YouTube Data API 配額受限或失效時，無法僅靠 oEmbed 一次性取得完整清單內容，需要額外的解析或降級機制。

### Proposed Fix / Action Items
- 在 `PlayerPage` 載入時檢測 URL 是否含有 `list` 參數：
  1. 若有 `list` 參數且當前未載入 `playlistVideos`，於背景自動呼叫 `youtubeService.getPlaylistVideos(listId)`。
  2. 取得清單後，以當前 `videoId` 匹配清單索引（`currentIndex`），構建播放隊列。
  3. 當影片觸發 `onEnded` 時，自動無縫切換到下一部影片。
- 若 YouTube API 失敗（配額限制），應在介面上提示使用者「清單自動連播受限，目前僅能播放本部影片」。

---

## BUG-016: YouTube Data API 配額受限或私人/無效清單時缺乏清晰錯誤降級

- Date: 2026-10-11
- Status: Open (未盡事項)
- Affected route(s): `/playlists`, `/watch`
- Affected component(s): `src/services/youtubeService.js`, `src/pages/PlayerPage.js`

### Symptoms
- 當使用者輸入私人清單、無效清單，或每日 YouTube Data API 查詢配額（Quota）用盡時，畫面直接顯示紅色警示「無法載入播放清單內容」，體驗較為中斷。

### Proposed Fix / Action Items
- 區分「API 配額受限（Quota Exceeded）」與「私人/無效清單」的錯誤原因，給予精確的 UI 指引（如提供手動備用 API Key 輸入，或建議改貼單部影片網址）。
- 建立本機已抓取清單資料的 LocalStorage / IndexedDB 快取備份，在 API 配額超限時仍能播放先前曾存取過的清單。

---

## BUG-017: 行動裝置瀏覽器自動播放限制（Autoplay Policy）對清單連播的阻擋與換首需手動點擊

- Date: 2026-10-11
- Status: Fixed
- Affected route(s): `/watch/:videoId`
- Affected component(s): `src/components/player/VideoPlayer.js`, `src/pages/PlayerPage.js`

### Symptoms
- 播放清單切換下一首影片時，播放器停在第 0 秒靜止，必須使用者手動點擊畫面才能繼續播放，無法主動自動連播。

### Root Cause
1. `react-youtube` 套件在 `videoId` 屬性改變時，內部預設的 `shouldResetPlayer` 會摧毀原有的 iframe 並重新創建全新 iframe。這導致原本使用者已授權的媒體會話與播放狀態全數遺失，全新建立的 iframe 缺乏使用者手勢關聯（User Activation），直接被行動端瀏覽器（iOS Safari / Android Chrome）判定為未經授權的自動播放而加以阻擋。
2. 播放清單影片播放完畢（`isEnded`）時，原邏輯僅觸發路由跳轉（`onVideoChange` -> `navigate`），未在同一個事件週期中直接呼叫 `loadVideoById` 與 `playVideo`。
3. 播放清單手動點選項目時僅執行 `navigate`，未在點擊事件的手勢視窗內同步命令播放器實例載入。

### Fix Implemented
1. **固化 iframe 實例，避免銷毀重建**：在 `VideoPlayer.js` 中傳入 `initialVideoIdRef.current` 給 `<YouTube>` 組件，確保組件生命週期內不因路由變化或切歌而重新掛載 iframe。
2. **無縫接續載入與立即播放**：當影片結束切換下一首或循環播放時，直接在 `isEnded` 當下以原實例呼叫 `ytPlayer.loadVideoById(nextVideo.id)` 與 `ytPlayer.playVideo()`，並同步更新父層網址，實現同會話內無縫連播。
3. **點選清單即時啟動**：在 `PlayerPage.js` 點擊清單影片卡片時，於使用者原生手勢（`onClick`）當下同步調用 `playerRef.current?.loadVideo(video.id)`。
4. **MediaSession 連播支援**：新增 `nexttrack` 與 `previoustrack` 處理函式，支援手機鎖定畫面、控制中心及耳機實體鍵換首時自動主動播放。

### Validation
- 播放清單播完當前歌曲後，自動載入下一首並立即主動播放，不再停頓在第 0 秒。
- 手動在清單點擊其他曲目時，立即切換並直接播放。
- 專案執行 `npm run build` 打包編譯成功。

---

## BUG-018: Android PWA / 主畫面捷徑更新相容性與舊快取常駐

- Date: 2026-10-11
- Status: Clarified & Documented
- Affected route(s): All routes (PWA 模式)
- Affected component(s): `public/manifest.json`, `public/sw.js`, `public/index.html`

### Symptoms
- 使用者疑慮伺服器部署新功能（例如切換下一首主動播放、介面優化等）後，原本已安裝在 Android 手機上的 PWA 或桌面捷徑是否需要移除重新設定，才能享受新功能。

### Root Cause & Architecture Analysis
1. **捷徑與 WebAPK 架構**：Android 建立的 PWA 主畫面捷徑本質為指向固定網址（`start_url: "/"`）的輕量外殼，並不把 JavaScript/CSS 業務邏輯寫死在捷徑中。伺服器更新代碼後，入口網址未變，捷徑依然有效。
2. **多工程序快取常駐**：Android 系統傾向在後台常駐已開啟的 PWA 程序（WebAPK/Chrome 核心），導致記憶體中可能繼續執行舊的 JS Bundle，直到該 Process 被銷毀重啟或收到 Service Worker 的更新通知。

### Resolution & Guidance
- **捷徑處理**：完全不需要重新設定或刪除重新加入主畫面，既有捷徑可無縫沿用。
- **更新生效操作**：若開啟後尚未即時反映最新功能，僅需將該 PWA 應用從 Android 後台多工列表完整滑掉關閉後重開，或於頁面向下拉動重新載入一次，即可載入最新部署程式碼。

### Follow-ups
- 建議於前端全域加入版本輪詢廣播機制（例如當 Service Worker 進入 `waiting` 或取得新版 hash 時，跳出「有新版本可用，點擊立即更新」提示），讓 PWA 用戶無需手動重開程序也能一鍵平滑更新。

