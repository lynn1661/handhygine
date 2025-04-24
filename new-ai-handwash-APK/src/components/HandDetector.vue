<template>
  <div class="hand-detector-container">
    <!-- 加载状态显示 -->
    <div v-if="!isReady" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-stage">{{ loadingStage }}</div>
        <div class="loading-progress-bar">
          <div class="progress-fill" :style="{ width: `${loadingProgress}%` }"></div>
        </div>
        <div v-if="loadingError" class="loading-error">
          <p>{{ loadingError }}</p>
          <button @click="retryInitialization" class="retry-button">重试</button>
        </div>
      </div>
    </div>

    <!-- 视频容器 -->
    <div class="video-container" :class="{ 'video-hidden': !isReady }">
      <video
        ref="videoElement"
        class="video-element"
        autoplay
        muted
        playsinline
      ></video>
      
      <!-- 手部标记层 -->
      <canvas ref="overlayCanvas" class="overlay-canvas"></canvas>
      
      <!-- 性能指标 -->
      <div v-if="showPerformanceStats" class="performance-stats">
        <div>FPS: {{ currentFps }}</div>
        <div>延迟: {{ detectionLatency }}ms</div>
        <div>检测到的手: {{ detectedHandsCount }}</div>
      </div>
    </div>
    
    <!-- 控制按钮 -->
    <div class="control-panel">
      <button @click="toggleCamera" :disabled="!isReady || isToggling">
        {{ isActive ? '暂停检测' : '开始检测' }}
      </button>
      <button @click="restartDetection" :disabled="!isReady || isRestarting">
        重新初始化
      </button>
      <select v-model="videoQuality" @change="changeVideoQuality" :disabled="!isReady">
        <option value="high">高质量</option>
        <option value="medium">中等质量</option>
        <option value="low">低质量 (快速)</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

// 引入依赖
// 注意：假设这些函数已在其他地方定义，根据您的项目实际情况调整
import { createSocket, sendHandData } from '../services/socketAdapter';

// 属性定义
const props = defineProps({
  // 是否显示性能统计
  showPerformanceStats: {
    type: Boolean,
    default: false
  },
  // 最大检测手数
  maxHands: {
    type: Number,
    default: 2
  },
  // 是否自动开始
  autoStart: {
    type: Boolean,
    default: true
  }
});

// 事件定义
const emit = defineEmits(['hands-detected', 'error', 'ready', 'status-change']);

// 状态变量
const isReady = ref(false);
const isActive = ref(false);
const isInitializing = ref(false);
const isToggling = ref(false);
const isRestarting = ref(false);
const loadingStage = ref('准备初始化');
const loadingProgress = ref(0);
const loadingError = ref('');
const currentFps = ref(0);
const detectionLatency = ref(0);
const detectedHandsCount = ref(0);
const consecutiveErrors = ref(0);
const videoQuality = ref('medium');

// DOM引用
const videoElement = ref(null);
const overlayCanvas = ref(null);

// 内部变量
let handDetector = null;
let videoStream = null;
let animationFrameId = null;
let lastFrameTime = 0;
let frameCounter = 0;
let fpsUpdateInterval = null;
let videoProcessing = false;
let canvasContext = null;
let videoWidth = 0;
let videoHeight = 0;

// 视频质量配置
const videoConfigs = {
  high: { width: 1280, height: 720, frameRate: 30 },
  medium: { width: 640, height: 480, frameRate: 30 },
  low: { width: 320, height: 240, frameRate: 15 }
};

// 分阶段加载过程
async function initializeDetector() {
  if (isInitializing.value) return;
  
  try {
    isInitializing.value = true;
    isReady.value = false;
    loadingError.value = '';
    
    // 阶段1：准备资源
    loadingStage.value = '加载核心引擎';
    loadingProgress.value = 10;
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 阶段2：请求摄像头
    loadingStage.value = '请求摄像头权限';
    loadingProgress.value = 30;
    try {
      await setupCamera();
    } catch (error) {
      console.error('摄像头访问失败:', error);
      loadingError.value = '无法访问摄像头，请确保已授予权限';
      loadingProgress.value = 0;
      isInitializing.value = false;
      emit('error', { type: 'camera', message: error.message });
      return;
    }
    
    // 阶段3：初始化手部检测器
    loadingStage.value = '初始化手部检测器';
    loadingProgress.value = 60;
    try {
      // 模拟 MediaPipe Hands 初始化
      // 实际项目中替换为真实的 MediaPipe 初始化代码
      await initMediaPipeHands();
    } catch (error) {
      console.error('手部检测器初始化失败:', error);
      loadingError.value = '初始化检测引擎失败，请重试';
      loadingProgress.value = 0;
      isInitializing.value = false;
      emit('error', { type: 'detector', message: error.message });
      return;
    }
    
    // 阶段4：设置画布
    loadingStage.value = '准备绘图画布';
    loadingProgress.value = 80;
    setupCanvas();
    
    // 阶段5：完成
    loadingStage.value = '准备就绪';
    loadingProgress.value = 100;
    
    // 延迟一点时间让用户看到完成状态
    await new Promise(resolve => setTimeout(resolve, 500));
    
    isReady.value = true;
    isInitializing.value = false;
    emit('ready');
    
    // 如果设置为自动开始，则激活检测
    if (props.autoStart) {
      await nextTick();
      activateDetection();
    }
    
  } catch (error) {
    console.error('初始化过程出错:', error);
    loadingError.value = '初始化过程中出现错误，请重试';
    loadingProgress.value = 0;
    isInitializing.value = false;
    emit('error', { type: 'initialization', message: error.message });
  }
}

// 设置摄像头
async function setupCamera() {
  if (videoStream) {
    // 关闭现有流
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  const config = videoConfigs[videoQuality.value];
  
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: config.width },
        height: { ideal: config.height },
        frameRate: { ideal: config.frameRate }
      }
    });
    
    if (videoElement.value) {
      videoElement.value.srcObject = videoStream;
      
      // 等待视频元数据加载
      await new Promise((resolve) => {
        videoElement.value.onloadedmetadata = () => {
          videoWidth = videoElement.value.videoWidth;
          videoHeight = videoElement.value.videoHeight;
          resolve();
        };
      });
    }
    
    return true;
  } catch (error) {
    console.error('获取摄像头失败:', error);
    throw error;
  }
}

// 初始化MediaPipe Hands
// 注意：这里使用了模拟实现，实际项目中替换为真实MediaPipe初始化
async function initMediaPipeHands() {
  try {
    // 关闭现有实例
    if (handDetector) {
      try {
        await handDetector.close();
      } catch (e) {
        console.warn('关闭旧检测器实例时出错:', e);
      }
      handDetector = null;
    }
    
    // 这里添加实际的MediaPipe Hands初始化代码
    // 示例:
    /*
    handDetector = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    await handDetector.setOptions({
      maxNumHands: props.maxHands,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    */
    
    // 模拟初始化延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 创建模拟检测器对象
    handDetector = {
      // 模拟检测方法
      async detectHands(video) {
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // 返回模拟手部数据
        return {
          multiHandLandmarks: [[
            {x: 0.5, y: 0.5, z: 0},  // 模拟手部关键点
            // ... 其他关键点
          ]],
          multiHandedness: [{
            label: 'Right',
            score: 0.95
          }]
        };
      },
      // 模拟关闭方法
      async close() {
        // 模拟关闭延迟
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    };
    
    console.log('手部检测器初始化成功');
    return handDetector;
  } catch (error) {
    console.error('手部检测器初始化失败:', error);
    throw error;
  }
}

// 设置画布
function setupCanvas() {
  if (!overlayCanvas.value || !videoElement.value) return;
  
  overlayCanvas.value.width = videoWidth;
  overlayCanvas.value.height = videoHeight;
  canvasContext = overlayCanvas.value.getContext('2d');
}

// 安全处理视频帧
async function processVideoFrame() {
  if (!isActive.value || !handDetector || !videoElement.value || videoProcessing) {
    // 如果不活跃或正在处理中，则跳过此帧
    if (isActive.value) {
      // 只有当处于活跃状态时，才请求下一帧
      animationFrameId = requestAnimationFrame(processVideoFrame);
    }
    return;
  }
  
  try {
    videoProcessing = true;
    
    // 记录开始时间，用于计算延迟
    const startTime = performance.now();
    
    // 使用检测器处理视频帧
    const results = await handDetector.detectHands(videoElement.value);
    
    // 计算延迟时间
    detectionLatency.value = Math.round(performance.now() - startTime);
    
    // 检测成功，重置错误计数
    consecutiveErrors.value = 0;
    
    // 处理检测结果
    if (results && results.multiHandLandmarks) {
      // 更新检测到的手数
      detectedHandsCount.value = results.multiHandLandmarks.length;
      
      // 绘制手部标记
      drawHandLandmarks(results);
      
      // 发送结果
      emit('hands-detected', results);
      
      // 可选：通过socket发送手部数据
      // sendHandData(results);
    } else {
      detectedHandsCount.value = 0;
      clearCanvas();
    }
    
    // 计算FPS
    const now = performance.now();
    frameCounter++;
    
    if (now - lastFrameTime >= 1000) {
      currentFps.value = Math.round(frameCounter * 1000 / (now - lastFrameTime));
      frameCounter = 0;
      lastFrameTime = now;
    }
    
  } catch (error) {
    console.error('处理视频帧时出错:', error);
    
    // 错误处理
    handleDetectionError(error);
    
  } finally {
    videoProcessing = false;
    
    // 如果仍处于激活状态，请求下一帧
    if (isActive.value) {
      animationFrameId = requestAnimationFrame(processVideoFrame);
    }
  }
}

// 绘制手部标记
function drawHandLandmarks(results) {
  if (!canvasContext) return;
  
  // 清除画布
  clearCanvas();
  
  // 绘制每个检测到的手
  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const landmarks = results.multiHandLandmarks[i];
    const handedness = results.multiHandedness[i];
    
    // 设置不同手的颜色
    const color = handedness.label === 'Left' ? 'rgb(44, 212, 103)' : 'rgb(228, 87, 46)';
    
    // 绘制关键点
    for (const landmark of landmarks) {
      // 转换坐标到画布尺寸
      const x = landmark.x * overlayCanvas.value.width;
      const y = landmark.y * overlayCanvas.value.height;
      
      // 绘制点
      canvasContext.fillStyle = color;
      canvasContext.beginPath();
      canvasContext.arc(x, y, 5, 0, 2 * Math.PI);
      canvasContext.fill();
    }
    
    // 这里可以添加连接点的线条绘制
    // drawConnectors(canvasContext, landmarks, HAND_CONNECTIONS, { color });
  }
}

// 清除画布
function clearCanvas() {
  if (canvasContext && overlayCanvas.value) {
    canvasContext.clearRect(0, 0, overlayCanvas.value.width, overlayCanvas.value.height);
  }
}

// 处理检测错误
function handleDetectionError(error) {
  consecutiveErrors.value++;
  
  // 发送错误事件
  emit('error', { 
    type: 'detection', 
    message: error.message,
    count: consecutiveErrors.value 
  });
  
  // 检查是否是BindingError
  const isBindingError = error.name === 'BindingError' && 
    error.message.includes('Cannot pass deleted object');
  
  // 如果是严重错误或连续多次错误，尝试重新初始化
  if (isBindingError || consecutiveErrors.value >= 3) {
    console.warn(`检测连续出错${consecutiveErrors.value}次，尝试重新初始化`);
    
    // 自动重新初始化
    restartDetection();
    
    // 重置错误计数
    consecutiveErrors.value = 0;
  }
}

// 激活检测
async function activateDetection() {
  if (isActive.value || isToggling.value || !isReady.value) return;
  
  try {
    isToggling.value = true;
    
    // 确保摄像头和检测器准备就绪
    if (!videoStream || !handDetector) {
      await initializeDetector();
    }
    
    // 开始处理视频帧
    isActive.value = true;
    lastFrameTime = performance.now();
    frameCounter = 0;
    
    // 启动FPS计算
    clearInterval(fpsUpdateInterval);
    fpsUpdateInterval = setInterval(() => {
      if (frameCounter === 0) {
        currentFps.value = 0;
      }
    }, 2000);
    
    // 开始处理帧
    animationFrameId = requestAnimationFrame(processVideoFrame);
    
    // 发送状态变更事件
    emit('status-change', 'active');
    
  } catch (error) {
    console.error('激活检测失败:', error);
    isActive.value = false;
    emit('error', { type: 'activation', message: error.message });
  } finally {
    isToggling.value = false;
  }
}

// 停止检测
function deactivateDetection() {
  if (!isActive.value || isToggling.value) return;
  
  try {
    isToggling.value = true;
    
    // 停止处理视频帧
    isActive.value = false;
    
    // 取消动画帧请求
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // 清除FPS更新定时器
    clearInterval(fpsUpdateInterval);
    
    // 清除画布
    clearCanvas();
    
    // 发送状态变更事件
    emit('status-change', 'inactive');
    
  } catch (error) {
    console.error('停止检测失败:', error);
    emit('error', { type: 'deactivation', message: error.message });
  } finally {
    isToggling.value = false;
  }
}

// 切换检测状态
async function toggleCamera() {
  if (isActive.value) {
    deactivateDetection();
  } else {
    await activateDetection();
  }
}

// 重试初始化
function retryInitialization() {
  if (isInitializing.value) return;
  initializeDetector();
}

// 重新启动检测
async function restartDetection() {
  if (isRestarting.value) return;
  
  try {
    isRestarting.value = true;
    
    // 停止当前检测
    deactivateDetection();
    
    // 关闭资源
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    
    if (handDetector) {
      try {
        await handDetector.close();
      } catch (e) {
        console.warn('关闭检测器时出错，继续重启过程:', e);
      }
      handDetector = null;
    }
    
    // 清除状态
    isReady.value = false;
    
    // 重新初始化
    await initializeDetector();
    
  } catch (error) {
    console.error('重启检测失败:', error);
    emit('error', { type: 'restart', message: error.message });
  } finally {
    isRestarting.value = false;
  }
}

// 更改视频质量
async function changeVideoQuality() {
  if (!isReady.value) return;
  
  const wasActive = isActive.value;
  
  // 先停止检测
  deactivateDetection();
  
  try {
    // 重新设置摄像头
    await setupCamera();
    
    // 更新画布尺寸
    setupCanvas();
    
    // 如果之前是激活状态，重新激活
    if (wasActive) {
      await activateDetection();
    }
  } catch (error) {
    console.error('更改视频质量失败:', error);
    emit('error', { type: 'quality-change', message: error.message });
  }
}

// 生命周期钩子
onMounted(() => {
  nextTick(() => {
    initializeDetector();
  });
});

// 组件卸载时清理资源
onUnmounted(() => {
  // 停止检测
  deactivateDetection();
  
  // 清除计时器
  clearInterval(fpsUpdateInterval);
  
  // 停止视频流
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  // 关闭检测器
  if (handDetector) {
    try {
      handDetector.close();
    } catch (e) {
      console.warn('卸载时关闭检测器出错:', e);
    }
    handDetector = null;
  }
});

// 监听器
watch(() => props.autoStart, (newValue) => {
  if (newValue && isReady.value && !isActive.value) {
    activateDetection();
  }
});

// 导出方法供父组件使用
defineExpose({
  activateDetection,
  deactivateDetection,
  restartDetection,
  changeVideoQuality
});
</script>

<style scoped>
.hand-detector-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f0f0f0;
}

.video-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 75%; /* 4:3 比例 */
  overflow: hidden;
  background-color: #000;
  transition: opacity 0.3s ease;
}

.video-hidden {
  opacity: 0.3;
}

.video-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-content {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 80%;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 15px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-stage {
  font-size: 16px;
  margin-bottom: 10px;
  color: #333;
}

.loading-progress-bar {
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  margin-bottom: 15px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.loading-error {
  color: #e74c3c;
  margin-top: 10px;
}

.retry-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background-color: #2980b9;
}

.performance-stats {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.control-panel {
  padding: 10px;
  display: flex;
  gap: 10px;
  justify-content: center;
  background-color: #f8f8f8;
  border-top: 1px solid #ddd;
}

.control-panel button, .control-panel select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.control-panel button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.control-panel button:disabled, .control-panel select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .loading-content {
    padding: 15px;
  }
  
  .control-panel {
    flex-wrap: wrap;
  }
  
  .control-panel button, .control-panel select {
    flex: 1;
    min-width: 120px;
  }
}
</style> 