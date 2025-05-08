import { io } from "socket.io-client";

// 全局单例Socket
let socket = null;
// 请求队列和响应映射
const pendingRequests = new Map();
let requestId = 0;

// Socket配置参数
const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,      // 增加重连尝试次数
  reconnectionDelay: 1000,       // 初始重连延迟
  reconnectionDelayMax: 10000,   // 最大重连延迟
  timeout: 20000,                // 增加连接超时时间到20秒
  pingInterval: 10000,           // 心跳间隔10秒
  pingTimeout: 5000              // 心跳超时5秒
};

// 请求配置
const REQUEST_CONFIG = {
  timeout: 15000,                // 请求超时时间
  maxRetries: 3,                 // 默认最大重试次数
  retryDelay: 1000               // 初始重试延迟
};

// 心跳定时器
let heartbeatTimer = null;

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

// 网络状态监听
function setupNetworkListeners() {
  window.addEventListener('online', () => {
    console.log('网络已恢复连接，重新连接Socket...');
    if (socket && !socket.connected) {
      socket.connect();
    }
  });

  window.addEventListener('offline', () => {
    console.log('网络连接已断开，Socket连接可能不可用');
  });
}

// 添加心跳检测功能
function startHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  
  heartbeatTimer = setInterval(() => {
    if (socket && socket.connected) {
      const pingStart = Date.now();
      // 发送一个极小的心跳包
      socket.emit('ping', {}, () => {
        const pingTime = Date.now() - pingStart;
        console.log(`Socket心跳正常，延迟：${pingTime}ms`);
      });
    } else if (socket) {
      console.log('Socket心跳检测：连接已断开，尝试重连...');
      socket.connect();
    }
  }, SOCKET_CONFIG.pingInterval);
}

export function initializeSocket() {
  if (!socket) {
    console.log('初始化Socket连接，配置:', SOCKET_CONFIG);
    
    // 使用固定的URL地址
    //? window.location.origin  // 自动使用当前页面的域名
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? "https://ai.polyuhandhygiene.com"  // 使用固定的AI服务地址
      : "http://localhost:9500";
    
    console.log('Socket连接URL:', socketUrl);
    socket = io(socketUrl, SOCKET_CONFIG);
    
    // 设置事件监听器
    socket.on("connect", () => {
      console.log("Socket连接成功，ID:", socket.id);
      startHeartbeat(); // 连接成功后启动心跳
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
      console.error("Socket连接错误:", error.message);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket断开连接，原因:", reason);
      // 如果不是客户端主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        console.log("尝试重新连接...");
        socket.connect();
      }
    });
    
    socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket重连成功，尝试次数: ${attemptNumber}`);
    });
    
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket尝试重连，第 ${attemptNumber} 次`);
    });
    
    socket.on("reconnect_error", (error) => {
      console.error("Socket重连错误:", error.message);
    });
    
    socket.on("reconnect_failed", () => {
      console.error("Socket重连失败，已达到最大尝试次数");
    });
    
    // 添加网络状态监听
    setupNetworkListeners();
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
      
      // 压缩消息数据以减少传输量
      const payload = compressMessage({ 
        data: message, 
        step: currentStep,
        requestId: currentRequestId 
      });
      
      socket.emit('message', payload);
      console.log(`已发送请求 ${currentRequestId} 到服务器`);
      
      // 设置超时处理，使用配置的超时时间
      setTimeout(() => {
        if (pendingRequests.has(currentRequestId)) {
          const error = new Error(`请求 ${currentRequestId} 超时（${REQUEST_CONFIG.timeout}ms）`);
          pendingRequests.get(currentRequestId).reject(error);
          pendingRequests.delete(currentRequestId);
          performanceMetrics.recordFailure();
        }
      }, REQUEST_CONFIG.timeout); 
      
    } catch (error) {
      performanceMetrics.recordFailure();
      rejectPromise(error);
    }
  });
}

// 消息压缩 - 减小传输数据体积
function compressMessage(message) {
  // 实际项目中可使用更复杂的压缩算法
  // 此处仅做简单优化，移除无用字段，减少精度等
  if (message.data && Array.isArray(message.data)) {
    // 对手部关键点数据做精度优化
    message.data = message.data.map(frame => {
      if (frame.Right) {
        frame.Right = frame.Right.map(hand => {
          if (hand.keypoints) {
            // 减少小数位数，节省带宽
            hand.keypoints = hand.keypoints.map(point => ({
              x: parseFloat(point.x.toFixed(2)),
              y: parseFloat(point.y.toFixed(2)),
              z: parseFloat(point.z.toFixed(2))
            }));
          }
          return hand;
        });
      }
      if (frame.Left) {
        frame.Left = frame.Left.map(hand => {
          if (hand.keypoints) {
            hand.keypoints = hand.keypoints.map(point => ({
              x: parseFloat(point.x.toFixed(2)),
              y: parseFloat(point.y.toFixed(2)),
              z: parseFloat(point.z.toFixed(2))
            }));
          }
          return hand;
        });
      }
      return frame;
    });
  }
  return message;
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
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
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

// 带重试的连接函数 - 使用指数退避策略
export function createConnectWithRetry(message, currentStep, maxRetries = REQUEST_CONFIG.maxRetries) {
  let retries = 0;
  
  const attempt = () => {
    return createConnect(message, currentStep)
      .catch(error => {
        if (retries < maxRetries && isRetryableError(error)) {
          retries++;
          // 使用指数退避策略计算下次重试延迟
          const delay = Math.min(
            REQUEST_CONFIG.retryDelay * Math.pow(2, retries - 1) + Math.random() * 1000,
            10000 // 最大10秒
          );
          console.log(`请求失败，${delay.toFixed(0)}ms后尝试第 ${retries} 次重试...`);
          
          return new Promise(resolve => setTimeout(resolve, delay))
            .then(attempt);
        }
        throw error;
      });
  };
  
  return attempt();
}

// 扩展可重试错误的判断条件
function isRetryableError(error) {
  const message = error.message.toLowerCase();
  return message.includes('timeout') || 
         message.includes('connection') ||
         message.includes('network') ||
         message.includes('断开') ||
         message.includes('refused') ||
         message.includes('aborted');
}
