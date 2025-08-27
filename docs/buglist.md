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