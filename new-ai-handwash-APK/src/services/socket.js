import { io } from "socket.io-client";

// 全局单例Socket
let socket = null;
// 请求队列和响应映射
const pendingRequests = new Map();
let requestId = 0;

// 性能监控指标收集
export const performanceMetrics = {
  requestCount: 0,
  successCount: 0,
  failureCount: 0,
  totalResponseTime: 0,
  lastResponseTime: 0,
  
  recordRequest() {
    this.requestCount++;
    return this.requestCount; // 返回当前请求计数，可用作请求ID
  },
  
  recordSuccess(responseTime) {
    this.successCount++;
    this.totalResponseTime += responseTime;
    this.lastResponseTime = responseTime;
  },
  
  recordFailure() {
    this.failureCount++;
  },
  
  getAverageResponseTime() {
    return this.successCount ? this.totalResponseTime / this.successCount : 0;
  },
  
  getSuccessRate() {
    return this.requestCount ? (this.successCount / this.requestCount) * 100 : 0;
  },
  
  getMetricsReport() {
    return {
      requests: this.requestCount,
      success: this.successCount,
      failures: this.failureCount,
      avgResponseTime: this.getAverageResponseTime().toFixed(2) + 'ms',
      successRate: this.getSuccessRate().toFixed(2) + '%',
      lastResponseTime: this.lastResponseTime + 'ms'
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

// 防抖动功能
let debounceTimer = null;

export function initializeSocket() {
  if (!socket) {
    socket = io("https://ai2.polyuhandhygiene.com", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on("connect", () => {
      console.log("Socket连接成功");
    });
    
    socket.on("message", (data) => {
      // 处理带有requestId的消息
      if (data.requestId && pendingRequests.has(data.requestId)) {
        const { resolve } = pendingRequests.get(data.requestId);
        resolve(data);
        pendingRequests.delete(data.requestId);
        console.log(`请求 ${data.requestId} 已处理完成`);
      } else {
        console.log('收到未知请求ID的数据:', data);
      }
    });
    
    socket.on("connect_error", (error) => {
      console.error("连接错误:", error);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket断开连接:" + reason);
    });
  }
  
  return socket;
}

// 使用Promise处理异步通信
export function createConnect(message, currentStep) {
  return new Promise((resolvePromise, rejectPromise) => {
    try {
      const socket = initializeSocket();
      
      if (!socket.connected) {
        console.log("Socket未连接，尝试重连...");
        socket.connect();
      }
      
      const startTime = Date.now();
      const currentRequestId = performanceMetrics.recordRequest();
      
      // 存储Promise解析器
      pendingRequests.set(currentRequestId, { 
        resolve: (data) => {
          const responseTime = Date.now() - startTime;
          performanceMetrics.recordSuccess(responseTime);
          console.log(`请求 ${currentRequestId} 响应时间: ${responseTime}ms`);
          resolvePromise(data);
        }, 
        reject: (error) => {
          performanceMetrics.recordFailure();
          console.error(`请求 ${currentRequestId} 失败:`, error);
          rejectPromise(error);
        }, 
        timestamp: startTime 
      });
      
      // 发送带有请求ID的消息
      const payload = { 
        data: message, 
        step: currentStep,
        requestId: currentRequestId 
      };
      
      socket.emit('message', payload);
      console.log(`已发送请求 ${currentRequestId} 到服务器`);
      
      // 设置超时处理
      setTimeout(() => {
        if (pendingRequests.has(currentRequestId)) {
          pendingRequests.delete(currentRequestId);
          performanceMetrics.recordFailure();
          rejectPromise(new Error(`请求 ${currentRequestId} 超时`));
        }
      }, 10000); // 10秒超时
      
    } catch (error) {
      performanceMetrics.recordFailure();
      rejectPromise(error);
    }
  });
}

// 发送日志到后端
export function sendLog(level, message) {
  const socket = initializeSocket();
  if (socket && socket.connected) {
    console.log(`发送日志到后端: ${message}`);
    socket.emit("log", { level, message });
  } else {
    console.warn("Socket未连接，无法发送日志");
  }
}

// 应用退出时清理
export function cleanupSocket() {
  if (socket) {
    // 清理所有挂起的请求
    pendingRequests.forEach(({ reject }) => {
      reject(new Error("应用关闭，请求被取消"));
    });
    pendingRequests.clear();
    
    socket.disconnect();
    socket = null;
    console.log("Socket资源已完全清理");
  }
}

// 不再需要每个组件都调用disconnect
export function disconnect() {
  // 此函数保留但不再执行真正的断开，而是在应用退出时调用cleanupSocket
  console.log("已废弃的断开连接调用，Socket保持连接状态");
}

// 防抖动功能
export function debounceConnect(message, currentStep, delay = 300) {
  return new Promise((resolve, reject) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(async () => {
      try {
        const result = await createConnect(message, currentStep);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

// 带重试的连接函数
export function createConnectWithRetry(message, currentStep, maxRetries = 2) {
  let retries = 0;
  
  const attempt = () => {
    return createConnect(message, currentStep)
      .catch(error => {
        if (retries < maxRetries && isRetryableError(error)) {
          retries++;
          console.log(`请求失败，尝试第 ${retries} 次重试...`);
          return new Promise(resolve => setTimeout(resolve, 1000 * retries))
            .then(attempt);
        }
        throw error;
      });
  };
  
  return attempt();
}

// 判断错误是否可重试
function isRetryableError(error) {
  return error.message.includes('timeout') || 
         error.message.includes('connection') ||
         error.message.includes('network');
}
