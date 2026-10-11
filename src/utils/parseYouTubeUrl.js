const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// 播放清單 ID 通常以 PL / UU / UL / OL / RD 開頭，但為求完整仍接受任意字元
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const YOUTUBE_URL_PATTERNS = [
  /youtu\.be\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/,
  /youtube\.com\/watch\?(?:[^\s?#]*&)?v=([A-Za-z0-9_-]{11})/i,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  /youtube\.com\/live\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  /youtube\.com\/v\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  /m\.youtube\.com\/watch\?(?:[^\s?#]*&)?v=([A-Za-z0-9_-]{11})/i,
  /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
];

// 播放清單連結的常見格式：
// - https://www.youtube.com/playlist?list=PLxxxx
// - https://www.youtube.com/watch?v=VIDEO_ID&list=PLxxxx
// - https://music.youtube.com/playlist?list=PLxxxx
// - https://www.youtube.com/@channel/playlists/PLxxxx
const PLAYLIST_QUERY_PATTERN = /[?&]list=([A-Za-z0-9_-]{10,64})/i;
const PLAYLIST_PATH_PATTERN = /\/playlist\?list=([A-Za-z0-9_-]{10,64})/i;
const PLAYLIST_EMBED_PATTERN = /youtube\.com\/playlist\/([A-Za-z0-9_-]{10,64})/i;

export const extractYouTubeVideoId = (input = '') => {
  const source = String(input).trim();

  if (!source) {
    return null;
  }

  if (VIDEO_ID_PATTERN.test(source)) {
    return source;
  }

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = source.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

export const extractYouTubePlaylistId = (input = '') => {
  const source = String(input).trim();

  if (!source) {
    return null;
  }

  if (PLAYLIST_ID_PATTERN.test(source)) {
    return source;
  }

  const queryMatch = source.match(PLAYLIST_QUERY_PATTERN);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  const pathMatch = source.match(PLAYLIST_PATH_PATTERN) || source.match(PLAYLIST_EMBED_PATTERN);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  return null;
};

export const parseYouTubeInput = (input = '') => {
  const source = String(input).trim();

  if (!source) {
    return null;
  }

  const playlistId = extractYouTubePlaylistId(source);
  const videoId = extractYouTubeVideoId(source);

  if (playlistId) {
    const indexMatch = source.match(/[?&]index=(\d+)/i);
    const startAt = indexMatch ? Math.max(1, Number(indexMatch[1])) : 1;
    return {
      type: 'playlist',
      id: playlistId,
      playlistId,
      videoId: videoId || null,
      startAt,
    };
  }

  if (videoId) {
    return {
      type: 'video',
      id: videoId,
      videoId,
    };
  }

  return null;
};

export const extractYouTubeVideoIdFromSharePayload = ({ title = '', text = '', url = '' } = {}) => {
  const candidates = [title, text, url, `${title} ${text} ${url}`]
    .filter(Boolean)
    .map((item) => String(item));

  for (const candidate of candidates) {
    const parsed = parseYouTubeInput(candidate);
    if (parsed?.type === 'video') {
      return parsed.id;
    }
  }

  return null;
};

// 從分享 payload 中解析出「影片或播放清單」，回傳 parseYouTubeInput 的結果或 null
export const parseYouTubeSharePayload = ({ title = '', text = '', url = '' } = {}) => {
  const candidates = [url, text, title, `${title} ${text} ${url}`]
    .filter(Boolean)
    .map((item) => String(item));

  for (const candidate of candidates) {
    const parsed = parseYouTubeInput(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};
