import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Container, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box,
  Tabs,
  Tab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { FaSearch } from 'react-icons/fa';
import youtubeService from '../services/youtubeService';

const SearchPage = () => {
  const navigate = useNavigate();
  const settings = useSelector((state) => state.settings);
  
  // 搜索狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('videos');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 過濾器狀態
  const [filters, setFilters] = useState({
    duration: 'any',
    uploadDate: 'any',
    hasSubtitles: false
  });
  
  // 處理搜索
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      let results;
      
      switch (searchType) {
        case 'videos':
          results = await youtubeService.searchVideos(searchQuery, filters);
          setSearchResults(results.data.items);
          break;
        case 'channels':
          results = await youtubeService.searchChannels(searchQuery);
          setSearchResults(results.data.items);
          break;
        case 'playlists':
          results = await youtubeService.searchPlaylists(searchQuery);
          setSearchResults(results.data.items);
          break;
        default:
          setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索錯誤:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 處理按鍵按下事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // 處理過濾器變更
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  // 處理影片點擊
  const handleVideoClick = (video) => {
    navigate(`/watch/${video.id}?title=${encodeURIComponent(video.title)}&channel=${encodeURIComponent(video.channel)}`);
  };
  
  // 處理頻道點擊
  const handleChannelClick = (channel) => {
    // 使用頻道ID作為影片ID，導航到播放器頁面
    // 在實際應用中，應該先獲取頻道的影片列表，然後播放第一個影片
    navigate(`/watch/${channel.id}?title=${encodeURIComponent(`${channel.title} 頻道`)}&channel=${encodeURIComponent(channel.title)}`);
  };
  
  // 處理播放清單點擊
  const handlePlaylistClick = (playlist) => {
    // 使用播放清單ID作為影片ID，導航到播放器頁面
    // 在實際應用中，應該先獲取播放清單的影片列表，然後播放第一個影片
    navigate(`/watch/${playlist.id}?title=${encodeURIComponent(`${playlist.title} 播放清單`)}&channel=${encodeURIComponent(playlist.channel)}`);
  };
  
  // 渲染搜索結果
  const renderSearchResults = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (searchResults.length === 0) {
      if (searchQuery) {
        return (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6" gutterBottom>沒有找到符合 "{searchQuery}" 的結果</Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              如果您使用的是模擬數據，請嘗試搜尋常見關鍵詞如「music」、「gaming」或「tutorial」。
              若要使用實際 YouTube 搜尋，請在 src/services/youtubeService.js 中設置有效的 API 密鑰。
            </Typography>
          </Box>
        );
      } else {
        return (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6">請輸入關鍵詞並點擊搜尋按鈕</Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              您可以搜尋影片、頻道或播放清單，並使用過濾器縮小結果範圍
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              注意：此應用使用 YouTube Data API v3。您需要在 src/services/youtubeService.js 中設置有效的 API 密鑰才能進行實際搜尋。
              如果未設置 API 密鑰，將使用模擬數據。
            </Typography>
          </Box>
        );
      }
    }
    
    return (
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {searchResults.map((item) => {
          switch (searchType) {
            case 'videos':
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.02)' },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handleVideoClick(item)}
                  >
                    <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 比例 */ }}>
                      <CardMedia
                        component="img"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        image={item.thumbnail}
                        alt={item.title}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6" component="div" noWrap>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.channel}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.duration}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.views}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            case 'channels':
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.02)' },
                      height: '100%'
                    }}
                    onClick={() => handleChannelClick(item)}
                  >
                    <Box sx={{ display: 'flex', p: 2 }}>
                      <CardMedia
                        component="img"
                        sx={{ width: 80, height: 80, borderRadius: '50%' }}
                        image={item.thumbnail}
                        alt={item.title}
                      />
                      <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.subscribers}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.videoCount}
                        </Typography>
                      </CardContent>
                    </Box>
                  </Card>
                </Grid>
              );
            case 'playlists':
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.02)' },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handlePlaylistClick(item)}
                  >
                    <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 比例 */ }}>
                      <CardMedia
                        component="img"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        image={item.thumbnail}
                        alt={item.title}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6" component="div" noWrap>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.channel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.videoCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            default:
              return null;
          }
        })}
      </Grid>
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        搜尋影片
      </Typography>
      
      {/* 搜索類型選擇 */}
      <Tabs
        value={searchType}
        onChange={(e, newValue) => setSearchType(newValue)}
        centered
        sx={{ mb: 3 }}
      >
        <Tab value="videos" label="影片" />
        <Tab value="channels" label="頻道" />
        <Tab value="playlists" label="播放清單" />
      </Tabs>
      
      {/* 搜索欄 */}
      <Box sx={{ display: 'flex', mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="搜尋..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ mr: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearch}
          startIcon={<FaSearch />}
        >
          搜尋
        </Button>
      </Box>
      
      {/* 過濾器 - 僅在影片搜索時顯示 */}
      {searchType === 'videos' && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>影片長度</InputLabel>
            <Select
              value={filters.duration}
              label="影片長度"
              onChange={(e) => handleFilterChange('duration', e.target.value)}
            >
              <MenuItem value="any">任意長度</MenuItem>
              <MenuItem value="short">短片 (&lt; 4分鐘)</MenuItem>
              <MenuItem value="long">長片 (≥ 4分鐘)</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>上傳時間</InputLabel>
            <Select
              value={filters.uploadDate}
              label="上傳時間"
              onChange={(e) => handleFilterChange('uploadDate', e.target.value)}
            >
              <MenuItem value="any">任意時間</MenuItem>
              <MenuItem value="today">今天</MenuItem>
              <MenuItem value="week">本週</MenuItem>
              <MenuItem value="month">本月</MenuItem>
              <MenuItem value="year">今年</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      
      {/* 搜索結果 */}
      {renderSearchResults()}
    </Container>
  );
};

export default SearchPage;