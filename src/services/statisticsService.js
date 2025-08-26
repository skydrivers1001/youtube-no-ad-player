// 統計服務 - 管理影片播放次數和用戶訪問數據

class StatisticsService {
  constructor() {
    this.storageKey = 'youtuber-no-ad-statistics';
    this.sessionKey = 'youtuber-no-ad-session';
    this.initializeData();
  }

  // 初始化統計數據 - 簡化版本，只追蹤數據使用量
  initializeData() {
    const defaultStats = {
      totalDataUsageGB: 0, // 總數據使用量（GB）
      dailyDataUsage: {}, // 每日數據使用量
      lastUpdated: new Date().toISOString()
    };

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.stats = { ...defaultStats, ...parsed };
      } catch (error) {
        console.error('統計數據解析錯誤:', error);
        this.stats = defaultStats;
      }
    } else {
      this.stats = defaultStats;
    }
  }

  // 記錄數據使用量
  recordDataUsage(dataUsageMB = 50) {
    if (!dataUsageMB || dataUsageMB <= 0) return;
    
    // 轉換為 GB
    const dataUsageGB = dataUsageMB / 1024;
    this.stats.totalDataUsageGB += dataUsageGB;
    
    // 更新每日數據使用量
    this.updateDailyDataUsage(dataUsageGB);
    
    // 批量保存 - 減少頻繁寫入
    this.debouncedSave();
  }

  // 更新每日數據使用量
  updateDailyDataUsage(dataUsageGB) {
    const today = new Date().toDateString();
    
    if (!this.stats.dailyDataUsage[today]) {
      this.stats.dailyDataUsage[today] = 0;
    }
    
    this.stats.dailyDataUsage[today] += dataUsageGB;
    this.stats.lastUpdated = new Date().toISOString();
  }

  // 防抖保存
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveStats();
    }, 1000);
  }

  // 保存統計數據
  saveStats() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (error) {
      console.error('保存統計數據失敗:', error);
    }
  }

  // 獲取統計數據
  getStats() {
    return {
      ...this.stats,
      todayDataUsage: this.getTodayDataUsage()
    };
  }

  // 獲取今日數據使用量
  getTodayDataUsage() {
    const today = new Date().toDateString();
    return this.stats.dailyDataUsage[today] || 0;
  }

  // 清除統計數據
  clearStats() {
    localStorage.removeItem(this.storageKey);
    this.initializeData();
  }

  // 格式化數據大小
  formatDataSize(gb) {
    if (gb === 0) return '0 GB';
    if (gb < 1) {
      return (gb * 1024).toFixed(2) + ' MB';
    }
    return gb.toFixed(2) + ' GB';
  }
}

// 創建單例實例
const statisticsService = new StatisticsService();

export default statisticsService;