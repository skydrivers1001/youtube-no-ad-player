import { createSlice } from '@reduxjs/toolkit';
import statisticsService from '../services/statisticsService';

const initialState = {
  totalDataUsageGB: 0,
  todayDataUsage: 0,
  dailyDataUsage: {},
  lastUpdated: null,
  isLoading: false,
  error: null
};

const statisticsSlice = createSlice({
  name: 'statistics',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateStats: (state, action) => {
      const { totalDataUsageGB, todayDataUsage, dailyDataUsage, lastUpdated } = action.payload;
      state.totalDataUsageGB = totalDataUsageGB || 0;
      state.todayDataUsage = todayDataUsage || 0;
      state.dailyDataUsage = dailyDataUsage || {};
      state.lastUpdated = lastUpdated;
      state.isLoading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setLoading,
  setError,
  updateStats,
  clearError
} = statisticsSlice.actions;

// Thunk actions
export const loadStatistics = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const stats = statisticsService.getStats();
    dispatch(updateStats(stats));
  } catch (error) {
    console.error('統計載入錯誤:', error);
    dispatch(setError('載入統計數據失敗: ' + error.message));
  }
};

export const recordDataUsage = (dataUsageMB) => async (dispatch) => {
  try {
    statisticsService.recordDataUsage(dataUsageMB);
    
    // 重新載入完整統計數據
    const stats = statisticsService.getStats();
    dispatch(updateStats(stats));
  } catch (error) {
    dispatch(setError('記錄數據使用失敗: ' + error.message));
  }
};

export const refreshStatistics = () => async (dispatch) => {
  dispatch(loadStatistics());
};

export default statisticsSlice.reducer;