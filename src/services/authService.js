import axios from 'axios';

// Google OAuth 客戶端 ID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID; // 從環境變量獲取

// Google OAuth 客戶端密鑰
const GOOGLE_CLIENT_SECRET = process.env.REACT_APP_GOOGLE_CLIENT_SECRET; // 從環境變量獲取

// 重定向 URI
const REDIRECT_URI = window.location.origin + '/auth/google/callback';

// 請求的權限範圍
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// 本地存儲鍵
const AUTH_STORAGE_KEY = 'youtuber_no_ad_auth';

/**
 * 初始化 Google OAuth 流程
 */
export const initiateGoogleAuth = () => {
  // 構建 OAuth 授權 URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;
  
  // 重定向到 Google 登入頁面
  window.location.href = authUrl;
};

/**
 * 同步用戶播放清單到 Google 帳號
 * @returns {Promise<void>}
 */
export const syncUserPlaylists = async () => {
  try {
    const authData = loadAuthFromStorage();
    if (!authData || !authData.accessToken) {
      throw new Error('未登入，無法同步');
    }

    // 從 Redux 獲取本地播放清單
    // 注意：在實際應用中，您需要從 Redux store 獲取播放清單
    // 這裡僅作為示例
    const store = window.store; // 假設您已將 store 暴露到全局
    const playlists = store.getState().playlists.playlists;

    // 將本地播放清單同步到 Google 帳號
    // 注意：YouTube API 不允許直接創建播放清單，需要使用特定的 API 端點
    // 這裡僅作為示例
    for (const playlist of playlists) {
      // 創建播放清單
      const response = await axios.post(
        'https://www.googleapis.com/youtube/v3/playlists',
        {
          snippet: {
            title: playlist.name,
            description: '從 Youtuber No AD 應用同步的播放清單',
          },
          status: {
            privacyStatus: 'private',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const playlistId = response.data.id;

      // 添加影片到播放清單
      for (const video of playlist.videos) {
        await axios.post(
          'https://www.googleapis.com/youtube/v3/playlistItems',
          {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: video.id,
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${authData.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    return true;
  } catch (error) {
    console.error('同步播放清單時出錯:', error);
    throw error;
  }
};

/**
 * 同步用戶觀看歷史到 Google 帳號
 * @returns {Promise<void>}
 */
export const syncUserHistory = async () => {
  try {
    const authData = loadAuthFromStorage();
    if (!authData || !authData.accessToken) {
      throw new Error('未登入，無法同步');
    }

    // 從 Redux 獲取本地觀看歷史
    // 注意：在實際應用中，您需要從 Redux store 獲取觀看歷史
    // 這裡僅作為示例
    const store = window.store; // 假設您已將 store 暴露到全局
    const history = store.getState().playlists.watchHistory;

    // 注意：YouTube API 不允許直接修改觀看歷史
    // 這裡僅作為示例，實際上可能需要使用其他方法
    console.log('同步觀看歷史功能尚未實現');

    return true;
  } catch (error) {
    console.error('同步觀看歷史時出錯:', error);
    throw error;
  }
};

/**
 * 使用授權碼交換訪問令牌
 * @param {string} code - 從 Google 重定向獲得的授權碼
 * @returns {Promise<Object>} 包含訪問令牌和用戶信息的對象
 */
export const exchangeCodeForToken = async (code) => {
  try {
    // 這一步通常應該在後端完成以保護客戶端密鑰
    // 在實際應用中，應該將此請求發送到您的後端服務
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // 獲取用戶信息
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userData = {
      id: userInfoResponse.data.id,
      email: userInfoResponse.data.email,
      name: userInfoResponse.data.name,
      picture: userInfoResponse.data.picture,
    };

    // 保存認證信息到本地存儲
    const authData = {
      user: userData,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date().getTime() + expires_in * 1000,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

    return {
      user: userData,
      accessToken: access_token,
    };
  } catch (error) {
    console.error('交換令牌時出錯:', error);
    throw error;
  }
};

/**
 * 從本地存儲加載認證狀態
 * @returns {Object|null} 認證狀態或 null
 */
export const loadAuthFromStorage = () => {
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) return null;

    const parsedData = JSON.parse(authData);
    const now = new Date().getTime();

    // 檢查令牌是否過期
    if (parsedData.expiresAt && parsedData.expiresAt < now) {
      // 令牌已過期，嘗試刷新
      // 注意：刷新令牌通常應該在後端處理
      return null;
    }

    return {
      user: parsedData.user,
      accessToken: parsedData.accessToken,
    };
  } catch (error) {
    console.error('從存儲加載認證時出錯:', error);
    return null;
  }
};

/**
 * 登出並清除本地存儲的認證信息
 */
export const logout = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

/**
 * 獲取用戶的 YouTube 播放清單
 * @param {string} accessToken - 訪問令牌
 * @returns {Promise<Array>} 播放清單數組
 */
export const fetchUserPlaylists = async (accessToken) => {
  try {
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlists',
      {
        params: {
          part: 'snippet,contentDetails',
          mine: true,
          maxResults: 50,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      videoCount: item.contentDetails.itemCount,
    }));
  } catch (error) {
    console.error('獲取播放清單時出錯:', error);
    throw error;
  }
};

/**
 * 獲取用戶的觀看歷史
 * @param {string} accessToken - 訪問令牌
 * @returns {Promise<Array>} 觀看歷史數組
 */
export const fetchWatchHistory = async (accessToken) => {
  try {
    // 注意：需要特殊權限才能訪問觀看歷史
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/history',
      {
        params: {
          part: 'snippet,contentDetails',
          maxResults: 50,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items.map((item) => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      watchedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('獲取觀看歷史時出錯:', error);
    throw error;
  }
};