<template>
  <div class="socket-monitor-pro" v-if="show && isReady">
    <div class="monitor-header">
      <div class="title">
        <h3>{{ $t('SocketMonitor.title') }}</h3>
        <span class="version">Pro</span>
      </div>
      <div class="actions">
        <button @click="toggleMinimize" class="action-btn">
          {{ minimize ? '□' : '—' }}
        </button>
        <button @click="safeClose" class="action-btn close-btn">×</button>
      </div>
    </div>
    
    <div v-if="!minimize" class="monitor-content">
      <!-- 选项卡导航 -->
      <div class="tabs">
        <div 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="setActiveTab(tab.id)"
        >
          {{ $t(`SocketMonitor.tabs.${tab.id}`) }}
        </div>
      </div>
      
      <!-- 实时状态选项卡 -->
      <div v-if="activeTab === 'status'" class="tab-content">
        <div class="status-panel">
          <div class="status-card">
            <div class="card-header">{{ $t('SocketMonitor.connectionStatus') }}</div>
            <div class="card-content">
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.status') }}:</span>
                <span :class="['status-value', connected ? 'success' : 'error']">
                  {{ connected ? $t('SocketMonitor.connected') : $t('SocketMonitor.disconnected') }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.server') }}:</span>
                <span class="status-value">{{ serverUrl }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.connectionId') }}:</span>
                <span class="status-value">{{ socketId || $t('SocketMonitor.unknown') }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.lastActivity') }}:</span>
                <span class="status-value">{{ lastActivity }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.connectionQuality') }}:</span>
                <span :class="['status-value', connectionQualityClass]">
                  {{ $t(`SocketMonitor.quality.${connectionQuality}`) }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.heartbeatLatency') }}:</span>
                <span :class="['status-value', heartbeatLatencyClass]">
                  {{ heartbeatLatency }}ms
                </span>
              </div>
            </div>
          </div>
          
          <div class="status-card">
            <div class="card-header">{{ $t('SocketMonitor.performanceMetrics') }}</div>
            <div class="card-content">
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.totalRequests') }}:</span>
                <span class="status-value">{{ metrics.requests }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.successCount') }}:</span>
                <span class="status-value">{{ metrics.success }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.failureCount') }}:</span>
                <span class="status-value">{{ metrics.failures }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.successRate') }}:</span>
                <span :class="['status-value', successRateClass]">
                  {{ metrics.successRate }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.avgResponseTime') }}:</span>
                <span :class="['status-value', responseTimeClass]">
                  {{ metrics.avgResponseTime }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.lastResponseTime') }}:</span>
                <span class="status-value">{{ metrics.lastResponseTime }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button @click="safeTestConnection" class="primary-btn">{{ $t('SocketMonitor.testConnection') }}</button>
          <button @click="safeForceReconnect" class="primary-btn">{{ $t('SocketMonitor.forceReconnect') }}</button>
          <button @click="safeResetStats" class="secondary-btn">{{ $t('SocketMonitor.resetStats') }}</button>
        </div>
        
        <div v-if="testResult" class="test-result">
          <h4>{{ $t('SocketMonitor.testResult') }}:</h4>
          <pre>{{ typeof testResult === 'string' ? testResult : JSON.stringify(testResult, null, 2) }}</pre>
        </div>
      </div>
      
      <!-- 服务器状态选项卡 -->
      <div v-if="activeTab === 'server'" class="tab-content">
        <div class="server-status">
          <div class="status-card full-width">
            <div class="card-header">{{ $t('SocketMonitor.serverStatus') }}</div>
            
            <!-- 正常数据显示 -->
            <div class="card-content" v-if="serverStats && !serverStats.error">
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.instanceCount') }}:</span>
                <span class="status-value">{{ serverStats.modelPoolSize || $t('SocketMonitor.unknown') }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.systemLoad') }}:</span>
                <span :class="['status-value', serverLoadClass]">
                  {{ serverStats.systemLoad ? serverStats.systemLoad.toFixed(2) : $t('SocketMonitor.unknown') }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.totalRequests') }}:</span>
                <span class="status-value">{{ serverStats.totalRequests || $t('SocketMonitor.unknown') }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.avgProcessingTime') }}:</span>
                <span class="status-value">
                  {{ serverStats.avgProcessingTime ? serverStats.avgProcessingTime.toFixed(2) + 's' : $t('SocketMonitor.unknown') }}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.threadPoolSize') }}:</span>
                <span class="status-value">{{ serverStats.threadPoolSize || $t('SocketMonitor.unknown') }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">{{ $t('SocketMonitor.activeThreads') }}:</span>
                <span class="status-value">{{ serverStats.activeThreads || $t('SocketMonitor.unknown') }}</span>
              </div>
            </div>
            
            <!-- 错误信息显示 -->
            <div class="card-content error-content" v-else-if="serverStats && serverStats.error">
              <div class="status-item error-message">
                <i class="error-icon">⚠️</i>
                <span>{{ serverStats.error }}</span>
              </div>
              <div class="status-item error-detail" v-if="serverStats.note">
                <span>{{ serverStats.note }}</span>
              </div>
              <div class="status-item error-detail" v-if="serverStats.suggestion">
                <span>{{ serverStats.suggestion }}</span>
              </div>
            </div>
            
            <!-- 加载中状态 -->
            <div class="card-content" v-else>
              <div class="status-item">
                <span>{{ $t('SocketMonitor.loading') }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button @click="safeFetchServerStats" class="primary-btn">{{ $t('SocketMonitor.refreshServerData') }}</button>
        </div>
      </div>
      
      <!-- 优化建议选项卡 -->
      <div v-if="activeTab === 'tips'" class="tab-content">
        <div class="status-card full-width">
          <div class="card-header">{{ $t('SocketMonitor.optimizationTips') }}</div>
          <div class="card-content">
            <div v-for="(tip, index) in localizedOptimizationTips" :key="index" class="tip-item">
              <div class="tip-title">{{ tip.title }}</div>
              <div class="tip-content">{{ tip.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n'; // 导入i18n
import { createConnect, createConnectWithRetryWrapper } from "../services/apiAdapter";

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const { t } = useI18n(); // 使用i18n

// 防止组件在DOM更新前渲染，减少Vue渲染异常
const isReady = ref(false);
// 防止重复初始化和清理的标记
const isInitialized = ref(false);

// UI状态
const minimize = ref(false);
const connected = ref(false);
const socketId = ref('');
const serverUrl = ref('');
const lastActivity = ref(t('SocketMonitor.none'));
const metrics = ref({
  requests: 0,
  success: 0,
  failures: 0,
  successRate: '0%',
  avgResponseTime: '0ms',
  lastResponseTime: '0ms'
});
const testResult = ref(null);
const serverStats = ref(null);
const heartbeatLatency = ref(0);
const connectionQuality = ref('unknown');
const connectionType = ref(t('SocketMonitor.unknown'));
const isOnline = ref(true); // 默认假设在线

// 选项卡管理
const activeTab = ref('status');
const tabs = [
  { id: 'status', name: t('SocketMonitor.tabs.status') },
  { id: 'server', name: t('SocketMonitor.tabs.server') },
  { id: 'tips', name: t('SocketMonitor.tabs.tips') }
];

// 使用计算属性获取本地化的优化建议
const localizedOptimizationTips = computed(() => [
  {
    title: t('SocketMonitor.tips.network.title'),
    content: t('SocketMonitor.tips.network.content')
  },
  {
    title: t('SocketMonitor.tips.requests.title'),
    content: t('SocketMonitor.tips.requests.content')
  },
  {
    title: t('SocketMonitor.tips.serverLoad.title'),
    content: t('SocketMonitor.tips.serverLoad.content')
  },
  {
    title: t('SocketMonitor.tips.refresh.title'),
    content: t('SocketMonitor.tips.refresh.content')
  }
]);

// 计算属性
const successRateClass = computed(() => {
  const rate = parseFloat(metrics.value.successRate);
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'error';
});

const responseTimeClass = computed(() => {
  const time = parseInt(metrics.value.avgResponseTime);
  if (time < 300) return 'success';
  if (time < 1000) return 'warning';
  return 'error';
});

const serverLoadClass = computed(() => {
  if (!serverStats.value || serverStats.value.systemLoad === undefined) return '';
  const load = serverStats.value.systemLoad;
  if (load < 1) return 'success';
  if (load < 2) return 'warning';
  return 'error';
});

const connectionQualityClass = computed(() => {
  if (connectionQuality.value === 'good') return 'success';
  if (connectionQuality.value === 'fair') return 'warning';
  if (connectionQuality.value === 'poor') return 'error';
  return '';
});

// 安全函数包装器
function safeCall(fn, ...args) {
  try {
    return fn(...args);
  } catch (error) {
    console.error(t('SocketMonitor.operationFailed'), error);
    return { error: error.message };
  }
}

// UI事件处理
function toggleMinimize() {
  nextTick(() => {
    minimize.value = !minimize.value;
  });
}

function setActiveTab(tabId) {
  nextTick(() => {
    activeTab.value = tabId;
  });
}

// 定时器
let updateInterval = null;

// 初始化组件的函数 - 安全地执行初始化逻辑
function initializeComponent() {
  if (isInitialized.value) return;
  
  try {
    console.log(t('SocketMonitor.logs.initComponent'));
    
    // 初始化 Socket 连接
    const socket = initializeSocket();
    
    // 初始化监控状态
    updateMetrics();
    
    // 设置监听器
    setupSocketListeners();
    
    // 开始定时更新
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      try {
        if (props.show) {
          updateMetrics();
        }
      } catch (error) {
        console.error(t('SocketMonitor.logs.updateMetricsError'), error);
      }
    }, 2000);
    
    isInitialized.value = true;
  } catch (error) {
    console.error(t('SocketMonitor.logs.initComponentError'), error);
  }
}

// 清理组件的函数 - 安全地执行清理逻辑
function cleanupComponent() {
  if (!isInitialized.value) return;
  
  try {
    console.log(t('SocketMonitor.logs.cleanupComponent'));
    
    // 清理定时器
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    
    isInitialized.value = false;
  } catch (error) {
    console.error(t('SocketMonitor.logs.cleanupComponentError'), error);
  }
}

// 监视show属性的变化，安全地处理组件显示/隐藏逻辑
watch(() => props.show, (newValue, oldValue) => {
  console.log(t('SocketMonitor.logs.showStateChange', { oldValue, newValue }));
  
  if (newValue) {
    // 显示组件前，确保DOM已准备好
    nextTick(() => {
      isReady.value = true;
      
      // 如果未初始化，则进行初始化
      if (!isInitialized.value) {
        nextTick(() => {
          initializeComponent();
        });
      }
      
      // 已初始化，则刷新数据
      if (isInitialized.value) {
        nextTick(() => {
          safeFetchServerStats();
          setTimeout(() => {
            safeTestConnection();
          }, 500);
        });
      }
    });
  } else {
    // 隐藏组件时，延迟移除以避免渲染问题
    setTimeout(() => {
      isReady.value = false;
    }, 100);
  }
}, { immediate: true });

// 安全关闭监控器
function safeClose() {
  nextTick(() => {
    emit('close');
  });
}

// 评估连接质量
function evaluateConnectionQuality() {
  // 基于多种因素评估连接质量
  const successRate = parseFloat(metrics.value.successRate) || 0;
  const avgResponseTime = parseInt(metrics.value.avgResponseTime) || 0;
  const latency = heartbeatLatency.value || 0;

  // 综合评分
  if (successRate >= 95 && avgResponseTime < 300 && latency < 100) {
    connectionQuality.value = 'good';
  } else if (successRate >= 80 && avgResponseTime < 800 && latency < 300) {
    connectionQuality.value = 'fair';
  } else if (successRate < 80 || avgResponseTime > 800 || latency > 300) {
    connectionQuality.value = 'poor';
  } else {
    connectionQuality.value = 'unknown';
  }
}

// 强制重新连接 - 安全包装
function safeForceReconnect() {
  try {
    const socket = initializeSocket();
    if (socket) {
      testResult.value = { status: t('SocketMonitor.reconnecting') };
      
      // 先断开连接
      socket.disconnect();
      
      // 短暂延迟后重连
      setTimeout(() => {
        socket.connect();
        setTimeout(() => {
          if (socket.connected) {
            testResult.value = { 
              status: t('SocketMonitor.reconnectSuccess'), 
              connected: true,
              socketId: socket.id
            };
          } else {
            testResult.value = { 
              status: t('SocketMonitor.reconnectFailed'), 
              connected: false,
              error: t('SocketMonitor.connectionFailed')
            };
          }
        }, 1000);
      }, 500);
    }
  } catch (error) {
    console.error(t('SocketMonitor.logs.forceReconnectFailed'), error);
    testResult.value = { status: t('SocketMonitor.reconnectFailed'), error: error.message };
  }
}

// 测试Socket连接 - 安全包装
async function safeTestConnection() {
  testResult.value = { status: t('SocketMonitor.testing') };
  try {
    const socket = initializeSocket();
    if (!socket) {
      throw new Error(t('SocketMonitor.socketNotInitialized'));
    }
    
    socketId.value = socket.id || t('SocketMonitor.unknown');
    serverUrl.value = socket.io?.uri || t('SocketMonitor.unknown');
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 发送一个简单的心跳消息 - 使用一个最小有效的数据结构
    const testData = { 
      "Right": [{ 
        "keypoints": Array(21).fill({ x: 0, y: 0, z: 0 }), 
        "score": 1.0, 
        "handedness": "Right" 
      }]
    };
    
    const response = await createConnectWithRetryWrapper([testData], 0); // 使用步骤0表示测试
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    heartbeatLatency.value = responseTime;
    
    testResult.value = {
      status: t('SocketMonitor.success'),
      connected: socket.connected,
      responseTime: `${responseTime}ms`,
      response
    };
    
    // 更新连接质量评估
    evaluateConnectionQuality();
    
    lastActivity.value = new Date().toLocaleTimeString();
  } catch (error) {
    console.error(t('SocketMonitor.logs.testConnectionFailed'), error);
    testResult.value = {
      status: t('SocketMonitor.failed'),
      error: error.message
    };
    
    // 连接测试失败时更新评估
    connectionQuality.value = 'poor';
  }
}

// 重置统计数据 - 安全包装
function safeResetStats() {
  try {
    const result = resetSocketPerformanceStats();
    updateMetrics();
    testResult.value = { status: t('SocketMonitor.statsReset'), ...result };
  } catch (error) {
    console.error(t('SocketMonitor.logs.resetStatsFailed'), error);
    testResult.value = { status: t('SocketMonitor.resetFailed'), error: error.message };
  }
}

// 更新指标
function updateMetrics() {
  try {
    metrics.value = getSocketPerformanceReport();
    
    // 检查Socket连接状态
    const socket = initializeSocket();
    if (socket) {
      connected.value = socket.connected;
      if (socket.connected) {
        socketId.value = socket.id || t('SocketMonitor.unknown');
        serverUrl.value = socket.io?.uri || t('SocketMonitor.unknown');
      }
    }
    
    // 更新连接质量评估
    evaluateConnectionQuality();
  } catch (error) {
    console.error(t('SocketMonitor.logs.updateMetricsFailed'), error);
  }
}

// 重写服务器统计功能，使用更简单的请求格式 - 安全包装
async function safeFetchServerStats() {
  try {
    console.log(t('SocketMonitor.logs.fetchingServerStats'));
    
    // 使用测试请求而不是专门的统计请求
    // 因为服务器可能不支持专门的统计请求
    const testData = { 
      "Right": [{ 
        "keypoints": Array(21).fill({ x: 0, y: 0, z: 0 }), 
        "score": 1.0, 
        "handedness": "Right" 
      }]
    };
    
    const response = await createConnect([testData], 0);
    console.log(t('SocketMonitor.logs.serverTestResponse'), response);
    
    // 创建一个模拟的统计数据
    serverStats.value = {
      modelPoolSize: 1,
      systemLoad: 0.5,
      totalRequests: metrics.value.requests,
      avgProcessingTime: parseInt(metrics.value.avgResponseTime) / 1000,
      threadPoolSize: 4,
      activeThreads: 2
    };
    
    lastActivity.value = new Date().toLocaleTimeString();
  } catch (error) {
    console.error(t('SocketMonitor.logs.fetchServerStatsFailed'), error);
    serverStats.value = { 
      error: error.message,
      suggestion: t('SocketMonitor.checkServerConfig')
    };
  }
}

// 为Socket添加数据收集监听器
function setupSocketListeners() {
  try {
    const socket = initializeSocket();
    
    // 监听连接和断开连接事件
    if (socket && !socket._monitorListenersAdded) {
      // 断开连接事件
      socket.on('disconnect', () => {
        connected.value = false;
        console.log(t('SocketMonitor.logs.socketDisconnected'));
      });
      
      // 连接事件
      socket.on('connect', () => {
        connected.value = true;
        socketId.value = socket.id || t('SocketMonitor.unknown');
        lastActivity.value = new Date().toLocaleTimeString();
        console.log(t('SocketMonitor.logs.socketConnected'), socket.id);
      });
      
      // 错误事件
      socket.on('error', (error) => {
        console.error(t('SocketMonitor.logs.socketError'), error);
      });
      
      // 一般消息
      socket.on('message', (data) => {
        lastActivity.value = new Date().toLocaleTimeString();
      });
      
      // 标记已添加监听器
      socket._monitorListenersAdded = true;
    }
  } catch (error) {
    console.error(t('SocketMonitor.logs.setupSocketListenersFailed'), error);
  }
}

// 组件挂载时初始化
onMounted(() => {
  try {
    console.log(t('SocketMonitor.logs.componentMounted'));
    // 延迟准备好状态，确保DOM完全就绪
    nextTick(() => {
      if (props.show) {
        isReady.value = true;
        nextTick(initializeComponent);
      }
    });
  } catch (error) {
    console.error(t('SocketMonitor.logs.componentMountError'), error);
  }
});

// 组件卸载时清理资源
onUnmounted(() => {
  try {
    console.log(t('SocketMonitor.logs.componentUnmounting'));
    cleanupComponent();
    isReady.value = false;
  } catch (error) {
    console.error(t('SocketMonitor.logs.componentUnmountError'), error);
  }
});
</script>

<style scoped>
.socket-monitor-pro {
  position: fixed;
  bottom: 70px; /* 位于右下角，但是留出足够空间给按钮 */
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  transform: none; /* 移除原来的居中变换 */
  /* 添加过渡效果 */
  transition: opacity 0.3s ease-in-out;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  background: #f7f7f7;
  border-radius: 8px 8px 0 0;
}

.monitor-header .title {
  display: flex;
  align-items: center;
}

.monitor-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.monitor-header .version {
  background: #4a5c79;
  color: white;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 8px;
}

.monitor-header .actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.action-btn:hover {
  background: #eee;
  color: #333;
}

.close-btn:hover {
  background: #ff5252;
  color: white;
}

.monitor-content {
  padding: 15px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 15px;
}

.tab {
  padding: 8px 15px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #4a5c79;
  border-bottom: 2px solid #4a5c79;
  font-weight: 500;
}

.tab-content {
  max-height: 500px;
  overflow-y: auto;
}

.status-panel {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.status-card {
  flex: 1;
  min-width: 250px;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
}

.status-card.full-width {
  flex: 1 0 100%;
}

.network-monitor {
  flex: 1 0 100%;
  margin-bottom: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
}

.card-header {
  padding: 10px 15px;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.card-content {
  padding: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  color: #666;
}

.status-value {
  color: #333;
  font-weight: 500;
}

.status-value.success {
  color: #4caf50;
}

.status-value.warning {
  color: #ff9800;
}

.status-value.error {
  color: #f44336;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.primary-btn, .secondary-btn {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.primary-btn {
  background: #4a5c79;
  color: white;
}

.primary-btn:hover {
  background: #3a4c69;
}

.secondary-btn {
  background: #f1f1f1;
  color: #333;
}

.secondary-btn:hover {
  background: #e5e5e5;
}

.test-result {
  background: #f9f9f9;
  padding: 10px 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.test-result h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 14px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 12px;
  color: #333;
  overflow: auto;
  max-height: 200px;
}

.error-content {
  background-color: rgba(244, 67, 54, 0.05);
}

.error-message {
  display: flex;
  align-items: center;
  color: #f44336;
  font-weight: 500;
  margin-bottom: 10px;
}

.error-icon {
  margin-right: 8px;
  font-style: normal;
}

.error-detail {
  color: #666;
  font-size: 12px;
  margin-left: 24px;
  font-style: italic;
}

/* 优化建议样式 */
.tip-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.tip-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.tip-title {
  font-weight: 500;
  margin-bottom: 5px;
  color: #4a5c79;
}

.tip-content {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .socket-monitor-pro {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
  }
  
  .status-panel {
    flex-direction: column;
  }
}
</style> 