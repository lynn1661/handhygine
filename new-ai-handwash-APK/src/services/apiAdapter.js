// apiAdapter.js - 替换Socket.IO的HTTP API适配器
import { 
  createConnect as httpCreateConnect,
  sendLog as httpSendLog,
  disconnect as httpDisconnect,
  cleanupSocket as httpCleanupSocket,
  initializeSocket as httpInitializeSocket,
  performanceMetrics,
  userService,
  dataService,
  checkServerHealth,
  setApiBaseUrl,
  getApiConfig
} from './api';

/**
 * 兼容旧版API的createConnect函数
 * 保留与Socket.IO版本相同的调用方式，但内部使用HTTP API
 */
export async function createConnect(message, currentStep) {
  try {
    console.log('🔄 使用HTTP API替换Socket通信');
    
    // 调用HTTP API版本
    const response = await httpCreateConnect(message, currentStep);
    
    // 保持与Socket.IO相同的返回格式
    return response;
  } catch (error) {
    console.error("HTTP API通信错误:", error);
    // 返回与Socket.IO相同的错误格式
    return { error: error.message, ans: 'False' };
  }
}

/**
 * 带重试功能的createConnect - 兼容原Socket版本
 */
export async function createConnectWithRetryWrapper(message, currentStep, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 HTTP API请求尝试 ${attempt}/${maxRetries + 1}`);
      const response = await createConnect(message, currentStep);
      
      // 如果返回成功结果，直接返回
      if (response && response.ans !== 'False') {
        return response;
      }
      
      // 如果是最后一次尝试，返回结果（即使失败）
      if (attempt === maxRetries + 1) {
        return response;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ HTTP API请求失败，尝试 ${attempt}/${maxRetries + 1}:`, error.message);
      
      if (attempt === maxRetries + 1) {
        return { error: error.message, ans: 'False' };
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return { error: lastError?.message || 'Unknown error', ans: 'False' };
}

/**
 * 防抖版本的createConnect
 */
let debounceTimer = null;
export async function createConnectWithDebounce(message, currentStep, delay = 300) {
  return new Promise((resolve) => {
    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 设置新的定时器
    debounceTimer = setTimeout(async () => {
      try {
        const response = await createConnect(message, currentStep);
        resolve(response);
      } catch (error) {
        resolve({ error: error.message, ans: 'False' });
      }
    }, delay);
  });
}

/**
 * 发送日志 - 兼容原Socket版本
 */
export async function sendLog(logData) {
  try {
    return await httpSendLog(logData);
  } catch (error) {
    console.error('发送日志失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 断开连接 - 兼容原Socket版本
 */
export function disconnect() {
  console.log('🔌 HTTP API: 断开连接');
  return httpDisconnect();
}

/**
 * 清理资源 - 兼容原Socket版本
 */
export function cleanupSocket() {
  console.log('🧹 HTTP API: 清理资源');
  return httpCleanupSocket();
}

/**
 * 初始化连接 - 兼容原Socket版本
 */
export function initializeSocket() {
  console.log('🚀 HTTP API: 初始化连接');
  return httpInitializeSocket();
}

/**
 * 获取性能报告 - 兼容原Socket版本
 */
export function getSocketPerformanceReport() {
  return performanceMetrics.getMetricsReport();
}

/**
 * 重置性能统计 - 兼容原Socket版本
 */
export function resetSocketPerformanceStats() {
  performanceMetrics.reset();
  return { success: true, message: 'HTTP API性能统计已重置' };
}

/**
 * 安全断开连接 - 兼容原Socket版本
 */
export function safeDisconnect() {
  console.log("HTTP API: 安全断开连接...");
  cleanupSocket();
}

/**
 * 导出用户服务 - 新增功能
 */
export { userService, dataService };

/**
 * 导出健康检查 - 新增功能
 */
export { checkServerHealth };

/**
 * 配置管理
 */
export { setApiBaseUrl, getApiConfig };

/**
 * 设置服务器地址 - 新增的配置功能
 * @param {string} serverUrl - 服务器URL，如 'http://localhost:8000'
 */
export function setServerUrl(serverUrl) {
  setApiBaseUrl(serverUrl);
  console.log('🔧 服务器地址已更新:', serverUrl);
}

/**
 * 检查服务器连接状态
 */
export async function checkConnection() {
  try {
    const health = await checkServerHealth();
    return {
      connected: health.status === 'healthy',
      server: 'Flask (HTTP API)',
      details: health
    };
  } catch (error) {
    return {
      connected: false,
      server: 'Flask (HTTP API)',
      error: error.message
    };
  }
}

// 默认导出兼容对象
export default {
  createConnect,
  createConnectWithRetryWrapper,
  createConnectWithDebounce,
  sendLog,
  disconnect,
  cleanupSocket,
  initializeSocket,
  getSocketPerformanceReport,
  resetSocketPerformanceStats,
  safeDisconnect,
  userService,
  dataService,
  checkServerHealth,
  setServerUrl,
  checkConnection
}; 