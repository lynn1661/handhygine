// api.js - Flask REST API 服务
import axios from 'axios';

// API配置
const API_CONFIG = {
  baseURL: 'http://localhost:8000',  // Flask服务器地址
  timeout: 15000,
  maxRetries: 3,
  retryDelay: 1000
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API请求: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API响应: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API响应错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 性能监控
export const performanceMetrics = {
  requestCount: 0,
  successCount: 0,
  failureCount: 0,
  totalResponseTime: 0,
  lastResponseTime: 0,
  
  recordRequest() {
    this.requestCount++;
    return Date.now(); // 返回开始时间
  },
  
  recordSuccess(startTime) {
    const responseTime = Date.now() - startTime;
    this.successCount++;
    this.totalResponseTime += responseTime;
    this.lastResponseTime = responseTime;
    console.log(`📊 请求耗时: ${responseTime}ms`);
  },
  
  recordFailure() {
    this.failureCount++;
  },
  
  getMetricsReport() {
    const averageResponseTime = this.requestCount > 0 ? 
      Math.round(this.totalResponseTime / this.successCount) : 0;
    
    return {
      总请求数: this.requestCount,
      成功请求数: this.successCount,
      失败请求数: this.failureCount,
      成功率: `${Math.round((this.successCount / this.requestCount) * 100)}%`,
      平均响应时间: `${averageResponseTime}ms`,
      最后响应时间: `${this.lastResponseTime}ms`
    };
  },
  
  reset() {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalResponseTime = 0;
    this.lastResponseTime = 0;
  }
};

// 重试函数
async function retryRequest(requestFn, maxRetries = API_CONFIG.maxRetries) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ 请求失败，尝试 ${attempt}/${maxRetries}:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt - 1); // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// 主要API函数：替换原来的socket通信
export async function createConnect(message, currentStep) {
  const startTime = performanceMetrics.recordRequest();
  
  try {
    const response = await retryRequest(async () => {
      return await apiClient.post('/api/handwash/analyze', {
        data: message,
        step: currentStep,
        timestamp: new Date().toISOString()
      });
    });
    
    performanceMetrics.recordSuccess(startTime);
    
    // 保持与原Socket.IO相同的返回格式
    return response.data;
    
  } catch (error) {
    performanceMetrics.recordFailure();
    console.error('❌ 洗手分析请求失败:', error);
    
    // 返回与原Socket.IO相同的错误格式
    return { 
      error: error.message, 
      ans: 'False',
      message: '请求失败，请检查网络连接'
    };
  }
}

// 用户服务API
export const userService = {
  // 用户登录
  async login(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/user/login', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 用户注册
  async register(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/user/register', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取用户信息
  async getUserInfo(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/user/getUserInfo', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 更新用户信息
  async updateUserInfo(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/user/updateUserInfo', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  }
};

// 数据服务API
export const dataService = {
  // 提交评分
  async submitRating(ratingData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/rating', ratingData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取用户评分历史
  async getUserRatings(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/getUserRatings', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取统计信息
  async getStats() {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/getStats', {});
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取排名
  async getRankings(data = {}) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/getRankings', data);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取用户排名
  async getUserRank(userData) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/getUserRank', userData);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  },

  // 获取设备排名
  async getDeviceRankings(data = {}) {
    const startTime = performanceMetrics.recordRequest();
    try {
      const response = await apiClient.post('/services/data/getDeviceRankings', data);
      performanceMetrics.recordSuccess(startTime);
      return response.data;
    } catch (error) {
      performanceMetrics.recordFailure();
      throw error;
    }
  }
};

// 健康检查
export async function checkServerHealth() {
  try {
    const response = await apiClient.get('/health');
    return {
      status: 'healthy',
      server: 'Flask',
      ...response.data
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// 测试API连接
export async function testConnection() {
  try {
    const response = await apiClient.post('/api/test', {
      message: 'connection test',
      timestamp: new Date().toISOString()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 发送日志（替换原来的sendLog函数）
export async function sendLog(logData) {
  try {
    const response = await apiClient.post('/api/logs', {
      ...logData,
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('发送日志失败:', error);
    return { success: false, error: error.message };
  }
}

// 导出兼容函数
export function disconnect() {
  console.log('🔌 HTTP API无需断开连接');
  return Promise.resolve();
}

export function cleanupSocket() {
  console.log('🧹 清理HTTP API资源');
  // 重置性能指标
  performanceMetrics.reset();
}

export function initializeSocket() {
  console.log('🚀 初始化HTTP API客户端');
  // 测试连接
  return testConnection();
}

// 设置API基础URL
export function setApiBaseUrl(url) {
  API_CONFIG.baseURL = url;
  apiClient.defaults.baseURL = url;
  console.log('🔧 API基础URL已更新:', url);
}

// 获取当前API配置
export function getApiConfig() {
  return {
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    maxRetries: API_CONFIG.maxRetries
  };
} 