<template>
  <div class="socket-monitor" v-if="show">
    <div class="socket-monitor-header">
      <h3>Socket监控</h3>
      <button class="close-btn" @click="close">×</button>
    </div>
    <div class="socket-monitor-content">
      <div class="status-info">
        <div class="status-item">
          <span class="label">连接状态:</span>
          <span class="value" :class="connected ? 'connected' : 'disconnected'">
            {{ connected ? '已连接' : '未连接' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">请求总数:</span>
          <span class="value">{{ metrics.requests }}</span>
        </div>
        <div class="status-item">
          <span class="label">成功数:</span>
          <span class="value">{{ metrics.success }}</span>
        </div>
        <div class="status-item">
          <span class="label">失败数:</span>
          <span class="value">{{ metrics.failures }}</span>
        </div>
        <div class="status-item">
          <span class="label">成功率:</span>
          <span class="value">{{ metrics.successRate }}</span>
        </div>
        <div class="status-item">
          <span class="label">平均响应时间:</span>
          <span class="value">{{ metrics.avgResponseTime }}</span>
        </div>
        <div class="status-item">
          <span class="label">最近响应时间:</span>
          <span class="value">{{ metrics.lastResponseTime }}</span>
        </div>
      </div>
      <div class="actions">
        <button @click="testConnection">测试连接</button>
        <button @click="resetStats">重置统计</button>
      </div>
      <div v-if="testResult" class="test-result">
        <h4>测试结果:</h4>
        <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  getSocketPerformanceReport, 
  resetSocketPerformanceStats,
  initializeSocket, 
  createConnect 
} from '../services/socketAdapter';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const connected = ref(false);
const metrics = ref({
  requests: 0,
  success: 0,
  failures: 0,
  successRate: '0%',
  avgResponseTime: '0ms',
  lastResponseTime: '0ms'
});
const testResult = ref(null);
let updateInterval = null;

// 关闭监控器
function close() {
  emit('close');
}

// 测试Socket连接
async function testConnection() {
  testResult.value = { status: '测试中...' };
  try {
    const socket = initializeSocket();
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 发送一个简单的心跳消息 - 使用一个最小有效的数据结构
    // 确保服务器能识别这是一个测试请求
    const testData = { 
      "Right": [{ 
        "keypoints": Array(21).fill({ x: 0, y: 0, z: 0 }), 
        "score": 1.0, 
        "handedness": "Right" 
      }],
      "Left": [{ 
        "keypoints": Array(21).fill({ x: 0, y: 0, z: 0 }), 
        "score": 1.0, 
        "handedness": "Left" 
      }]
    };
    
    const response = await createConnect([testData], 0); // 使用步骤0表示测试
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    testResult.value = {
      status: '成功',
      connected: socket.connected,
      responseTime: `${responseTime}ms`,
      response
    };
  } catch (error) {
    testResult.value = {
      status: '失败',
      error: error.message
    };
  }
}

// 重置统计数据
function resetStats() {
  const result = resetSocketPerformanceStats();
  updateMetrics();
  testResult.value = { status: '统计已重置', ...result };
}

// 更新指标
function updateMetrics() {
  metrics.value = getSocketPerformanceReport();
  
  // 检查Socket连接状态
  const socket = initializeSocket();
  connected.value = socket.connected;
}

// 组件挂载时启动定时更新
onMounted(() => {
  updateMetrics();
  updateInterval = setInterval(updateMetrics, 2000);
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.socket-monitor {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  z-index: 9999;
}

.socket-monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.socket-monitor-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.socket-monitor-content {
  padding: 15px;
}

.status-info {
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #333;
}

.connected {
  color: #4caf50;
}

.disconnected {
  color: #f44336;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

button {
  padding: 6px 12px;
  background: #4a5c79;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0f387c;
}

.test-result {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
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
}
</style> 