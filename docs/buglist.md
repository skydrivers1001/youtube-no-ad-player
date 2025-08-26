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