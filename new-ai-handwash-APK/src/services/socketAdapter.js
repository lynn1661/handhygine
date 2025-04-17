// socketAdapter.js - 兼容旧版API的适配器
import { 
  initializeSocket,
  createConnect as newCreateConnect, 
  createConnectWithRetry,
  debounceConnect,
  sendLog, 
  disconnect, 
  cleanupSocket,
  performanceMetrics
} from './socket';

/**
 * 兼容旧版API的createConnect函数
 * 保留与旧代码相同的调用方式，但内部使用新的Promise实现
 */
export async function createConnect(message, currentStep) {
  try {
    // 确保Socket已初始化
    initializeSocket();
    
    // 调用新的实现，但保持与旧版API相同的返回形式
    const response = await newCreateConnect(message, currentStep);
    
    // 为保持兼容性，只返回响应数据部分
    return response;
  } catch (error) {
    console.error("Socket通信错误:", error);
    // 返回一个带有错误信息的对象，确保不会导致调用代码崩溃
    return { error: error.message, ans: 'False' };
  }
}

/**
 * 导出防抖动版本的createConnect
 * 适用于快速连续调用场景，避免请求风暴
 */
export async function createConnectWithDebounce(message, currentStep, delay = 300) {
  try {
    // 确保Socket已初始化
    initializeSocket();
    
    // 使用防抖动实现
    const response = await debounceConnect(message, currentStep, delay);
    
    return response;
  } catch (error) {
    console.error("Socket通信错误(防抖):", error);
    return { error: error.message, ans: 'False' };
  }
}

/**
 * 导出带重试功能的createConnect
 * 适用于网络不稳定场景
 */
export async function createConnectWithRetryWrapper(message, currentStep, maxRetries = 2) {
  try {
    // 确保Socket已初始化
    initializeSocket();
    
    // 使用重试实现
    const response = await createConnectWithRetry(message, currentStep, maxRetries);
    
    return response;
  } catch (error) {
    console.error("Socket通信错误(重试):", error);
    return { error: error.message, ans: 'False' };
  }
}

/**
 * 获取Socket性能报告
 */
export function getSocketPerformanceReport() {
  return performanceMetrics.getMetricsReport();
}

/**
 * 重置性能统计数据
 */
export function resetSocketPerformanceStats() {
  performanceMetrics.reset();
  return { success: true, message: '性能统计已重置' };
}

/**
 * 导出其他函数保持API完整性
 */
export { sendLog, disconnect, cleanupSocket, initializeSocket };

/**
 * 添加新的安全断开连接函数
 * 在应用退出时调用，清理所有资源
 */
export function safeDisconnect() {
  console.log("安全断开Socket连接...");
  cleanupSocket();
} 