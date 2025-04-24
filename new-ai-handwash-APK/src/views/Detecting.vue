<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：与其他页面保持一致 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="back-btn" @click="backHome">
          <img src="../assets/blueHome.png" alt="返回首页" />
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-section">
        <div class="instruction-section">
          <h1 class="detecting-title">{{ $t("HandHygiene.positionYourHands") }}</h1>
          <p class="detecting-subtitle">{{ $t("HandHygiene.detectingWordDescription") }}</p>
        </div>

        <!-- 相机预览区域 -->
        <div class="camera-section">
          <div class="camera-container">
            <video class="input_video"></video>
            <canvas class="output_canvas" width="1280px" height="720px"></canvas>
            
            <!-- 加载指示器 -->
            <div class="loading" :class="{ 'show': loadingVisible, 'error': loadingError }">
              <div class="spinner"></div>
              <div class="message">{{ loadingMessage }}</div>
              <button v-if="loadingError" class="retry-btn" @click="retryInitialization">重试</button>
            </div>
            
            <!-- 完成图标覆盖层 -->
            <div v-if="completeDisplay" class="complete-overlay">
              <img src="../assets/success.png" alt="成功" />
            </div>
            
            <!-- 检测提示文字 -->
            <div v-if="!completeDisplay && !loadingVisible" class="detect-text">
              {{ $t("HandHygiene.detecting") }}...
            </div>
            
            <!-- 倒计时 -->
            <div v-if="!completeDisplay && !loadingVisible" class="countdown-timer">
              <div class="timer-circle">
                <span>{{ countdownDisplay }}s</span>
              </div>
            </div>
          </div>
          
          <!-- 控制面板 - 隐藏但保留功能 -->
          <div class="control-panel" style="display: none;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, reactive, nextTick } from "vue";
import * as controls from "@mediapipe/control_utils";
import * as mpHands from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { useRouter } from "vue-router";
import { safeInitializeHands, safeRestartHands, safeCloseHands } from "../services/hand";

const router = useRouter();

// 倒计时逻辑
const percentage = ref(100);
const countdown = ref(3);
const countdownDisplay = ref(countdown.value);
const countdownStarted = ref(false);
const completeDisplay = ref(false);
let timer = null; // 声明计时器变量
const state = reactive({
  redirectTimeoutId: true,
});

// 加载状态管理
const loadingVisible = ref(true);
const loadingError = ref(false);
const loadingMessage = ref("正在初始化...");
const initializationAttempts = ref(0);
const MAX_RETRY_ATTEMPTS = 3;

// 跟踪检测状态
let handDetected = false;
let handDetectionStartTime = 0;
const HAND_DETECTION_REQUIRED_TIME = 1000; // 需要连续检测到手的毫秒数
let handsInstance = null;
let detectionActive = false;
let consecutiveErrors = 0;

const startCountdown = () => {
  if (countdownStarted.value) return;
  countdownStarted.value = true;
  
  countdown.value = 3; // 重置倒计时
  countdownDisplay.value = countdown.value; // 更新显示的倒计时值

  timer = setInterval(() => {
    countdown.value--;
    let str = Math.ceil((countdown.value / 3) * 100); //取整数
    percentage.value = str;
    countdownDisplay.value = countdown.value >= 0 ? countdown.value : "";
    if (countdown.value === 0) {
      clearInterval(timer);
      countdownDisplay.value = 0; // 设置为空字符串
      completeDisplay.value = true; // 显示Complete！
      if (state.redirectTimeoutId) {
        setTimeout(() => {
          router.push({
            path: "/hands/1",
          });
        }, 1500); // 略微缩短等待时间
      }
    }
  }, 1000);
};

const stopCountdown = () => {
  countdownStarted.value = false;
  clearInterval(timer);
  countdownDisplay.value = 3;
  percentage.value = 100;
};

const backHome = () => {
  state.redirectTimeoutId = false;
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  localStorage.removeItem("accountSerialNumber");
  sessionStorage.removeItem("accountSerialNumber");
  router.push({
    path: "/",
  });
};

// 初始化MediaPipe Hands
async function initializeMediaPipe() {
  if (initializationAttempts.value >= MAX_RETRY_ATTEMPTS) {
    loadingError.value = true;
    loadingMessage.value = "初始化失败，请刷新页面重试";
    return;
  }

  try {
    loadingVisible.value = true;
    loadingError.value = false;
    loadingMessage.value = "正在初始化视频流...";
    initializationAttempts.value++;
    
    console.log(`📹 尝试初始化 (${initializationAttempts.value}/${MAX_RETRY_ATTEMPTS})...`);
    
    // 获取视频和Canvas元素
    const videoElement = document.getElementsByClassName("input_video")[0];
    const canvasElement = document.getElementsByClassName("output_canvas")[0];
    
    if (!videoElement || !canvasElement) {
      console.error("📹 未找到视频或Canvas元素");
      throw new Error("未找到视频或Canvas元素");
    }
    
    // 分阶段加载以提供更好的用户反馈
    loadingMessage.value = "配置检测引擎...";
    await new Promise(resolve => setTimeout(resolve, 300));
    
    loadingMessage.value = "请求摄像头权限...";
    
    try {
      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          frameRate: { ideal: 30, max: 60 } 
        } 
      });
      
      videoElement.srcObject = stream;
      await new Promise(resolve => {
        videoElement.onloadedmetadata = resolve;
      });
      
      // 保存视频流引用以便稍后清理
      window.videoStream = stream;
      
    } catch (error) {
      console.error("📹 摄像头访问失败:", error);
      loadingError.value = true;
      loadingMessage.value = "无法访问摄像头，请确保已授予权限";
      throw error;
    }
    
    loadingMessage.value = "初始化手部检测...";
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 配置并初始化MediaPipe Hands
    try {
      const fpsControl = new controls.FPS();
      
      // 初始化MediaPipe Hands
      if (window.handsInstance) {
        try {
          await window.handsInstance.close();
        } catch (e) {
          console.warn("关闭旧实例时出错:", e);
        }
        window.handsInstance = null;
      }
      
      const config = {
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
        }
      };
      
      handsInstance = new mpHands.Hands(config);
      window.handsInstance = handsInstance;
      
      // 配置检测结果回调
      handsInstance.onResults(results => safeOnResults(results, canvasElement, fpsControl));
      
      // 设置MediaPipe选项
      await handsInstance.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      // 设置摄像头源
      const camera = new controls.SourcePicker({
        onFrame: async (input, size) => {
          if (!detectionActive) return;
          
          try {
            if (handsInstance) {
              await handsInstance.send({ image: input });
            }
          } catch (error) {
            handleDetectionError(error);
          }
        }
      });
      
      // 激活检测
      detectionActive = true;
      
      // 隐藏加载指示器
      setTimeout(() => {
        loadingVisible.value = false;
        consecutiveErrors = 0;
      }, 1000);
      
      console.log("📹 初始化成功");
      
    } catch (error) {
      console.error("📹 MediaPipe初始化失败:", error);
      throw error;
    }
    
  } catch (error) {
    console.error("📹 初始化过程出错:", error);
    loadingError.value = true;
    loadingMessage.value = "初始化失败: " + (error.message || "未知错误");
    
    // 尝试清理可能存在的部分资源
    cleanupResources();
  }
}

// 处理检测结果
function safeOnResults(results, canvasElement, fpsControl) {
  try {
    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;
    
    // 隐藏加载指示器
    document.body.classList.add("loaded");
    if (fpsControl) fpsControl.tick();
    
    // 清除画布并绘制视频帧
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.image) {
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
    }
    
    // 如果检测到手
    if (results.multiHandLandmarks && results.multiHandedness && results.multiHandLandmarks.length > 0) {
      // 重置错误计数
      consecutiveErrors = 0;
      
      // 手部检测逻辑
      if (!handDetected) {
        handDetected = true;
        handDetectionStartTime = Date.now();
      } else if (!countdownStarted.value && Date.now() - handDetectionStartTime >= HAND_DETECTION_REQUIRED_TIME) {
        // 如果连续检测到手超过了指定时间，且倒计时尚未开始，则开始倒计时
        startCountdown();
      }
      
      // 绘制手部标记
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === "Right";
        const landmarks = results.multiHandLandmarks[index];
        
        drawingUtils.drawConnectors(
          canvasCtx,
          landmarks,
          mpHands.HAND_CONNECTIONS,
          { color: isRightHand ? "#00FF00" : "#FF0000" }
        );
        
        drawingUtils.drawLandmarks(canvasCtx, landmarks, {
          color: isRightHand ? "#00FF00" : "#FF0000",
          fillColor: isRightHand ? "#FF0000" : "#00FF00",
          radius: (data) => {
            return drawingUtils.lerp(data.from.z, -0.15, 0.1, 10, 1);
          },
        });
      }
    } else {
      // 未检测到手
      handDetected = false;
      
      // 如果手离开画面且倒计时已经开始但尚未完成，则停止倒计时
      if (countdownStarted.value && !completeDisplay.value) {
        stopCountdown();
      }
    }
    
    canvasCtx.restore();
    
  } catch (error) {
    handleDetectionError(error);
  }
}

// 错误处理
function handleDetectionError(error) {
  console.error("检测过程中出错:", error);
  consecutiveErrors++;
  
  // 检查是否是已删除对象错误
  const isBindingError = error.name === 'BindingError' && 
                       error.message.includes('Cannot pass deleted object');
  
  // 如果是严重错误或连续出现多次错误，尝试重新初始化
  if (isBindingError || consecutiveErrors >= 3) {
    console.warn(`检测连续出错${consecutiveErrors}次，尝试重新启动...`);
    
    // 显示错误状态
    loadingVisible.value = true;
    loadingError.value = true;
    loadingMessage.value = "检测中断，正在尝试恢复...";
    
    // 停止倒计时
    if (countdownStarted.value) {
      stopCountdown();
    }
    
    // 尝试重新初始化
    restartDetection();
  }
}

// 重新初始化检测
async function restartDetection() {
  // 停止当前检测
  detectionActive = false;
  
  // 清理资源
  cleanupResources();
  
  // 重置状态
  handDetected = false;
  consecutiveErrors = 0;
  
  // 延迟后重新初始化
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 重新初始化
  initializeMediaPipe();
}

// 清理资源
function cleanupResources() {
  // 关闭MediaPipe实例
  if (window.handsInstance) {
    try {
      window.handsInstance.close();
    } catch (e) {
      console.warn("关闭MediaPipe实例时出错:", e);
    }
    window.handsInstance = null;
  }
  
  // 停止视频流
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(track => track.stop());
    } catch (e) {
      console.warn("停止视频流时出错:", e);
    }
    window.videoStream = null;
  }
}

// 重试初始化
function retryInitialization() {
  // 重置尝试次数
  initializationAttempts.value = 0;
  restartDetection();
}

onMounted(() => {
  console.log("📹 组件已挂载，准备初始化...");
  
  // 确保DOM已渲染
  nextTick(() => {
    setTimeout(() => {
      initializeMediaPipe();
    }, 500);
  });
});

onUnmounted(() => {
  console.log("📹 组件卸载中，清理资源...");
  
  // 停止倒计时
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  // 标记检测为非活动状态
  detectionActive = false;
  state.redirectTimeoutId = false;
  
  // 清理资源
  cleanupResources();
});
</script>

<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/deletingBG.png");  /* 恢复原来的背景 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  box-sizing: border-box;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;  /* 修改为100%，使内容区域占满屏幕宽度 */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  min-height: 90vh;
  position: relative;
  padding: 0.5rem;
}

/* 顶部区域样式 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-image {
  width: auto;
  height: 3rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
}

.back-btn {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
  
  img {
    width: 100%;
    height: 100%;
  }
  
  @media (max-width: 480px) {
    width: 2.5rem;
    height: 2.5rem;
  }
}

/* 主要内容区域 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 1rem;
  justify-content: center;
}

/* 指导区域 */
.instruction-section {
  text-align: center;
  margin-bottom: 1rem;
  max-width: 800px;  /* 限制指导文本宽度 */
  margin-left: auto;
  margin-right: auto;
}

.detecting-title {
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1.75rem;
  color: #0f387c;
  margin: 0 0 0.75rem 0;
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
}

.detecting-subtitle {
  font-family: "Helvetica85", sans-serif;
  font-weight: 500;
  font-size: 1.1rem;
  color: #4a5c79;
  margin: 0;
  line-height: 1.4;
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
}

/* 相机区域 */
.camera-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.camera-container {
  width: 100%;
  max-width: 90%;  /* 增加视频容器的最大宽度 */
  position: relative;
  background: transparent;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.15);
  aspect-ratio: 16/9;
  margin: 0 auto;
}

.output_canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  transform: scaleY(-1);
  background: transparent;
  border-radius: 16px;
}

.input_video {
  background: transparent;
  border-radius: 16px;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 加载指示器 */
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: #0f387c;
    border-radius: 50%;
    animation: spin 1s infinite linear;
  }
  
  .message {
    margin-top: 10px;
    color: white;
    font-weight: 500;
    font-size: 1rem;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
}

/* 完成覆盖层 */
.complete-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 5;
  
  img {
    width: 160px;
    height: 160px;
    animation: pulse 1.5s infinite ease-in-out;
  }
}

/* 检测文字 */
.detect-text {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: "Helvetica85", sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 3;
}

/* 倒计时 */
.countdown-timer {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
}

.timer-circle {
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #7791bc;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  
  span {
    font-family: "Helvetica85", sans-serif;
    font-weight: 700;
    font-size: 1.75rem;
    color: #0f387c;
  }
  
  @media (max-width: 480px) {
    width: 3rem;
    height: 3rem;
    
    span {
      font-size: 1.5rem;
    }
  }
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 响应式布局调整 */
@media (max-height: 600px) {
  .instruction-section {
    margin-bottom: 0.5rem;
  }
  
  .detecting-title {
    font-size: 1.25rem;
    margin-bottom: 0.3rem;
  }
  
  .detecting-subtitle {
    font-size: 0.9rem;
  }
  
  .camera-container {
    max-width: 450px;
  }
  
  .complete-overlay img {
    width: 120px;
    height: 120px;
  }
  
  .detect-text {
    font-size: 1.25rem;
  }
}

@media (min-height: 900px) {
  .main-section {
    gap: 2rem;
  }
  
  .instruction-section {
    margin-bottom: 1.5rem;
  }
  
  .detecting-title {
    font-size: 2rem;
  }
  
  .detecting-subtitle {
    font-size: 1.25rem;
  }
}

@media (min-width: 1200px) {
  .camera-container {
    max-width: 95%;  /* 在大屏幕上占据更多空间 */
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 0.25rem;  /* 减小内边距，提供更多空间给视频 */
  }
}
</style>
