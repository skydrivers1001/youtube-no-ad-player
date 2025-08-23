// YouTube API 服務
// 使用真實的 YouTube Data API v3

import axios from 'axios';

// YouTube API 密鑰
// 從環境變量中獲取 API 密鑰
const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

// 獲取授權標頭
const getAuthHeaders = (accessToken) => {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// 模擬API響應延遲
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 格式化 ISO 8601 時長為可讀格式 (PT1H2M3S -> 1:02:03)
const formatDuration = (isoDuration) => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

// 格式化觀看次數
const formatViews = (viewCount) => {
  const count = parseInt(viewCount);
  if (count >= 1000000000) {
    return (count / 1000000000).toFixed(1) + 'B';
  } else if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  } else {
    return count.toString();
  }
};

// 格式化日期
const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD 格式
};

// 回退到模擬數據的搜索函數
const fallbackSearchVideos = (query, filters = {}) => {
  console.log('使用模擬數據進行影片搜索');
  
  // 返回模擬數據
  let filteredVideos = [...mockVideos];
  
  // 模擬過濾功能
  if (filters.duration === 'short') {
    filteredVideos = filteredVideos.filter(video => {
      const [mins, secs] = video.duration.split(':').map(Number);
      return mins < 4;
    });
  } else if (filters.duration === 'long') {
    filteredVideos = filteredVideos.filter(video => {
      const [mins, secs] = video.duration.split(':').map(Number);
      return mins >= 4;
    });
  }
  
  // 模擬搜索功能 - 更寬鬆的匹配
  if (query) {
    const lowerQuery = query.toLowerCase();
    // 將查詢拆分為關鍵詞，允許任何關鍵詞匹配
    const keywords = lowerQuery.split(/\s+/);
    
    filteredVideos = filteredVideos.filter(video => {
      const videoTitle = video.title.toLowerCase();
      const videoChannel = video.channel.toLowerCase();
      
      // 只要有一個關鍵詞匹配即可
      return keywords.some(keyword => 
        videoTitle.includes(keyword) || 
        videoChannel.includes(keyword)
      );
    });
  }
  
  return {
    data: {
      items: filteredVideos
    }
  };
};

// 回退到模擬數據的頻道搜索函數
const fallbackSearchChannels = (query) => {
  console.log('使用模擬數據進行頻道搜索');
  
  // 返回模擬數據
  let filteredChannels = [...mockChannels];
  
  // 模擬搜索功能 - 更寬鬆的匹配
  if (query) {
    const lowerQuery = query.toLowerCase();
    // 將查詢拆分為關鍵詞，允許任何關鍵詞匹配
    const keywords = lowerQuery.split(/\s+/);
    
    filteredChannels = filteredChannels.filter(channel => {
      const channelTitle = channel.title.toLowerCase();
      
      // 只要有一個關鍵詞匹配即可
      return keywords.some(keyword => channelTitle.includes(keyword));
    });
  }
  
  return {
    data: {
      items: filteredChannels
    }
  };
};

// 回退到模擬數據的播放清單搜索函數
const fallbackSearchPlaylists = (query) => {
  console.log('使用模擬數據進行播放清單搜索');
  
  // 返回模擬數據
  let filteredPlaylists = [...mockPlaylists];
  
  // 模擬搜索功能 - 更寬鬆的匹配
  if (query) {
    const lowerQuery = query.toLowerCase();
    // 將查詢拆分為關鍵詞，允許任何關鍵詞匹配
    const keywords = lowerQuery.split(/\s+/);
    
    filteredPlaylists = filteredPlaylists.filter(playlist => {
      const playlistTitle = playlist.title.toLowerCase();
      const playlistChannel = playlist.channel.toLowerCase();
      
      // 只要有一個關鍵詞匹配即可
      return keywords.some(keyword => 
        playlistTitle.includes(keyword) || 
        playlistChannel.includes(keyword)
      );
    });
  }
  
  return {
    data: {
      items: filteredPlaylists
    }
  };
};

// 模擬搜索結果數據
const mockVideos = [
  {
    id: 'dQw4w9WgXcQ',
    title: '【無廣告】Rick Astley - Never Gonna Give You Up',
    channel: 'Rick Astley',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    duration: '3:32',
    views: '1.2B 次觀看',
    publishedAt: '2009-10-25'
  },
  {
    id: '9bZkp7q19f0',
    title: '【無廣告】PSY - GANGNAM STYLE(강남스타일)',
    channel: 'officialpsy',
    thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    duration: '4:12',
    views: '4.6B 次觀看',
    publishedAt: '2012-07-15'
  },
  {
    id: 'kJQP7kiw5Fk',
    title: '【無廣告】Luis Fonsi - Despacito ft. Daddy Yankee',
    channel: 'Luis Fonsi',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    duration: '4:41',
    views: '8.1B 次觀看',
    publishedAt: '2017-01-12'
  },
  {
    id: 'JGwWNGJdvx8',
    title: '【無廣告】Ed Sheeran - Shape of You',
    channel: 'Ed Sheeran',
    thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    duration: '4:23',
    views: '5.8B 次觀看',
    publishedAt: '2017-01-30'
  },
  {
    id: 'RgKAFK5djSk',
    title: '【無廣告】Wiz Khalifa - See You Again ft. Charlie Puth',
    channel: 'Wiz Khalifa',
    thumbnail: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
    duration: '3:58',
    views: '5.6B 次觀看',
    publishedAt: '2015-04-06'
  },
  {
    id: 'OPf0YbXqDm0',
    title: '【無廣告】Mark Ronson - Uptown Funk ft. Bruno Mars',
    channel: 'Mark Ronson',
    thumbnail: 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg',
    duration: '4:30',
    views: '4.7B 次觀看',
    publishedAt: '2014-11-19'
  },
];

// 模擬頻道數據
const mockChannels = [
  {
    id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
    title: 'PewDiePie',
    thumbnail: 'https://yt3.ggpht.com/ytc/AMLnZu-vTEkwGKbWh9-MQELqGGtLDPvXXgQK5H2uLYRO=s176-c-k-c0x00ffffff-no-rj',
    subscribers: '111M 位訂閱者',
    videoCount: '4,500 部影片'
  },
  {
    id: 'UCq-Fj5jknLsUf-MWSy4_brA',
    title: 'T-Series',
    thumbnail: 'https://yt3.ggpht.com/ytc/AMLnZu_GY_TuUXyEUJXRKZ9Z_vCnEFRBYY7WgLSMW-UI=s176-c-k-c0x00ffffff-no-rj',
    subscribers: '229M 位訂閱者',
    videoCount: '18,000 部影片'
  },
  {
    id: 'UCbCmjCuTUZos6Inko4u57UQ',
    title: 'Cocomelon - Nursery Rhymes',
    thumbnail: 'https://yt3.ggpht.com/ytc/AMLnZu9s5UVuZGVyeOtdAMVlJXQQslzLb1PgqFfbH7jn=s176-c-k-c0x00ffffff-no-rj',
    subscribers: '152M 位訂閱者',
    videoCount: '850 部影片'
  },
];

// 模擬播放清單數據
const mockPlaylists = [
  {
    id: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
    title: '熱門音樂影片',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    videoCount: '50 部影片',
    channel: 'YouTube Music'
  },
  {
    id: 'PL55713C70BA91BD6E',
    title: '經典電影配樂',
    thumbnail: 'https://i.ytimg.com/vi/1G4isv_Fylg/hqdefault.jpg',
    videoCount: '100 部影片',
    channel: 'Movie Soundtracks'
  },
  {
    id: 'PLFgquLnL59akA2PflFpeQG9L01VFg90wS',
    title: '學習程式設計',
    thumbnail: 'https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg',
    videoCount: '75 部影片',
    channel: 'Programming Tutorials'
  },
];

// YouTube API 服務
const youtubeService = {
  // 搜索影片
  searchVideos: async (query, filters = {}, accessToken = null) => {
    try {
      if (!query) {
        // 如果沒有查詢，返回熱門影片
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos`, {
            params: {
              part: 'snippet,contentDetails,statistics',
              chart: 'mostPopular',
              regionCode: 'TW', // 可以根據用戶所在地區調整
              maxResults: 10,
              ...(accessToken ? {} : { key: API_KEY })
            },
            headers: getAuthHeaders(accessToken)
          }
        );
        
        // 轉換 API 響應格式以匹配應用程序期望的格式
        const formattedResults = response.data.items.map(item => ({
          id: item.id,
          title: `【無廣告】${item.snippet.title}`,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.high.url,
          duration: formatDuration(item.contentDetails.duration),
          views: formatViews(item.statistics.viewCount) + ' 次觀看',
          publishedAt: formatDate(item.snippet.publishedAt)
        }));
        
        return {
          data: {
            items: formattedResults
          }
        };
      }
      
      // 構建查詢參數
      const params = {
        part: 'snippet',
        maxResults: 10,
        q: query,
        type: 'video',
        key: API_KEY
      };
      
      // 添加過濾器
      if (filters.duration === 'short') {
        params.videoDuration = 'short'; // 少於 4 分鐘
      } else if (filters.duration === 'long') {
        params.videoDuration = 'long'; // 大於 20 分鐘
      }
      
      if (filters.uploadDate === 'today') {
        params.publishedAfter = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      } else if (filters.uploadDate === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        params.publishedAfter = lastWeek.toISOString();
      } else if (filters.uploadDate === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        params.publishedAfter = lastMonth.toISOString();
      }
      
      // 發送搜索請求
      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        { 
          params: accessToken ? { ...params, key: undefined } : params,
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 獲取影片 ID 列表
      const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');
      
      // 獲取詳細信息（包括時長、觀看次數等）
      const videoDetailsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'snippet,contentDetails,statistics',
            id: videoIds,
            ...(accessToken ? {} : { key: API_KEY })
          },
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 合併搜索結果和詳細信息
      const formattedResults = videoDetailsResponse.data.items.map(item => ({
        id: item.id,
        title: `【無廣告】${item.snippet.title}`,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount) + ' 次觀看',
        publishedAt: formatDate(item.snippet.publishedAt)
      }));
      
      return {
        data: {
          items: formattedResults
        }
      };
    } catch (error) {
      console.error('YouTube API 搜索錯誤:', error);
      
      // 如果 API 調用失敗，回退到模擬數據
      console.warn('回退到模擬數據');
      return fallbackSearchVideos(query, filters);
    }
  },
  
  // 搜索頻道
  searchChannels: async (query, accessToken = null) => {
    try {
      if (!query) {
        // 如果沒有查詢，返回熱門頻道
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/channels`, {
            params: {
              part: 'snippet,statistics',
              maxResults: 10,
              chart: 'mostPopular',
              regionCode: 'TW',
              ...(accessToken ? {} : { key: API_KEY })
            },
            headers: getAuthHeaders(accessToken)
          }
        );
        
        // 轉換 API 響應格式
        const formattedResults = response.data.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          subscribers: formatViews(item.statistics.subscriberCount) + ' 位訂閱者',
          videoCount: formatViews(item.statistics.videoCount) + ' 部影片'
        }));
        
        return {
          data: {
            items: formattedResults
          }
        };
      }
      
      // 發送搜索請求
      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            maxResults: 10,
            q: query,
            type: 'channel',
            ...(accessToken ? {} : { key: API_KEY })
          },
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 獲取頻道 ID 列表
      const channelIds = searchResponse.data.items.map(item => item.id.channelId).join(',');
      
      // 獲取詳細信息
      const channelDetailsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'snippet,statistics',
            id: channelIds,
            ...(accessToken ? {} : { key: API_KEY })
          },
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 合併搜索結果和詳細信息
      const formattedResults = channelDetailsResponse.data.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        subscribers: formatViews(item.statistics.subscriberCount) + ' 位訂閱者',
        videoCount: formatViews(item.statistics.videoCount) + ' 部影片'
      }));
      
      return {
        data: {
          items: formattedResults
        }
      };
    } catch (error) {
      console.error('YouTube API 頻道搜索錯誤:', error);
      
      // 如果 API 調用失敗，回退到模擬數據
      console.warn('回退到模擬頻道數據');
      return fallbackSearchChannels(query);
    }
  },
  
  // 搜索播放清單
  searchPlaylists: async (query, accessToken = null) => {
    try {
      if (!query) {
        // 如果沒有查詢，返回熱門播放清單
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/playlists`, {
            params: {
              part: 'snippet,contentDetails',
              maxResults: 10,
              chart: 'mostPopular',
              regionCode: 'TW',
              ...(accessToken ? {} : { key: API_KEY })
            },
            headers: getAuthHeaders(accessToken)
          }
        );
        
        // 轉換 API 響應格式
        const formattedResults = response.data.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          videoCount: item.contentDetails.itemCount + ' 部影片',
          channel: item.snippet.channelTitle
        }));
        
        return {
          data: {
            items: formattedResults
          }
        };
      }
      
      // 發送搜索請求
      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            maxResults: 10,
            q: query,
            type: 'playlist',
            ...(accessToken ? {} : { key: API_KEY })
          },
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 獲取播放清單 ID 列表
      const playlistIds = searchResponse.data.items.map(item => item.id.playlistId).join(',');
      
      // 獲取詳細信息
      const playlistDetailsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/playlists',
        {
          params: {
            part: 'snippet,contentDetails',
            id: playlistIds,
            ...(accessToken ? {} : { key: API_KEY })
          },
          headers: getAuthHeaders(accessToken)
        }
      );
      
      // 合併搜索結果和詳細信息
      const formattedResults = playlistDetailsResponse.data.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        videoCount: item.contentDetails.itemCount + ' 部影片',
        channel: item.snippet.channelTitle
      }));
      
      return {
        data: {
          items: formattedResults
        }
      };
    } catch (error) {
      console.error('YouTube API 播放清單搜索錯誤:', error);
      
      // 如果 API 調用失敗，回退到模擬數據
      console.warn('回退到模擬播放清單數據');
      return fallbackSearchPlaylists(query);
    }
  },
  
  // 獲取影片詳情
  getVideoDetails: async (videoId) => {
    await delay(500);
    
    const video = mockVideos.find(v => v.id === videoId);
    if (!video) {
      throw new Error('Video not found');
    }
    
    return {
      data: {
        items: [video]
      }
    };
  },
  
  // 獲取相關影片
  getRelatedVideos: async (videoId) => {
    await delay(700);
    
    // 隨機選擇一些影片作為相關影片
    const relatedVideos = mockVideos
      .filter(v => v.id !== videoId)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    return {
      data: {
        items: relatedVideos
      }
    };
  }
};

export default youtubeService;