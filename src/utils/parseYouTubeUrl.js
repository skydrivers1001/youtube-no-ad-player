const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

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

export const extractYouTubeVideoIdFromSharePayload = ({ title = '', text = '', url = '' } = {}) => {
  const candidates = [title, text, url, `${title} ${text} ${url}`]
    .filter(Boolean)
    .map((item) => String(item));

  for (const candidate of candidates) {
    const videoId = extractYouTubeVideoId(candidate);
    if (videoId) {
      return videoId;
    }
  }

  return null;
};
