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
            <div class="loading">
              <div class="spinner"></div>
              <div class="message">{{ $t('Loading') || 'Loading' }}</div>
            </div>
            
            <!-- 完成图标覆盖层 -->
            <div v-if="completeDisplay" class="complete-overlay">
              <img src="../assets/success.png" alt="成功" />
            </div>
            
            <!-- 检测提示文字 -->
            <div v-if="!completeDisplay" class="detect-text">
              {{ $t("HandHygiene.detecting") }}...
            </div>
            
            <!-- 倒计时 -->
            <div v-if="!completeDisplay" class="countdown-timer">
              <div class="timer-circle">
                <span>{{ countdownDisplay }}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, reactive } from "vue";
// 移除 ES 模块导入，因为本地 MediaPipe 文件不是 ES 模块格式
// 改为动态加载脚本后使用全局变量

import { useRouter } from "vue-router";

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

// 添加状态变量，用于处理加载和初始化
const isInitializing = ref(true);
const hasError = ref(false);
const errorMessage = ref('');

const startCountdown = () => {
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
        }, 2000); // 稍微缩短等待时间
      }
    }
  }, 1000);
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

const stopCountdown = () => {
  clearInterval(timer);
  countdownDisplay.value = 3;
  percentage.value = 100;
};

// 显式添加控制面板DOM元素
function addControlPanel() {
  const controlPanel = document.createElement('div');
  controlPanel.className = 'control-panel';
  controlPanel.style.display = 'none';
  document.querySelector('.camera-section').appendChild(controlPanel);
  return controlPanel;
}

// 动态加载多个 MediaPipe 脚本
function loadMediaPipeScripts() {
  const scripts = [
    '/mediapipe/control_utils.js',
    '/mediapipe/drawing_utils.js',
    '/mediapipe/hands/hands.js'
  ];
  
  return Promise.all(scripts.map(src => {
    return new Promise((resolve, reject) => {
      // 检查脚本是否已经加载
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      console.log(`动态加载脚本: ${src}`);
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        console.log(`脚本加载成功: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`脚本加载失败: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }));
}

// 等待本地 MediaPipe 脚本加载完成
function waitForMediaPipeLoaded() {
  return new Promise(async (resolve, reject) => {
    try {
      // 首先加载所有必要的脚本
      await loadMediaPipeScripts();
      
      // 然后等待全局变量可用
      const timeout = setTimeout(() => {
        reject(new Error('MediaPipe 全局变量加载超时'));
      }, 10000);
      
      const interval = setInterval(() => {
        // 检查所有必要的全局变量是否已加载
        if (typeof window.Hands !== 'undefined' && 
            typeof window.ControlUtils !== 'undefined' && 
            typeof window.drawingUtils !== 'undefined') {
          clearInterval(interval);
          clearTimeout(timeout);
          console.log("所有 MediaPipe 组件已加载完成");
          resolve();
        }
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}

onMounted(() => {
  console.log("📹 初始化视频流...");
  isInitializing.value = true;
  
  // 使用setTimeout延迟初始化MediaPipe，确保DOM已完全渲染
  setTimeout(async () => {
    try {
      // 等待本地 MediaPipe 脚本加载完成
      await waitForMediaPipeLoaded();
      console.log("📹 本地 MediaPipe 脚本已加载完成");
      
      await initializeMediaPipe();
    } catch (error) {
      console.error("MediaPipe初始化失败:", error);
      hasError.value = true;
      errorMessage.value = error.message;
      isInitializing.value = false;
    }
  }, 500);
});

// 将MediaPipe初始化提取为独立函数
async function initializeMediaPipe() {
  // 获取视频元素并检查是否存在
  const videoElement = document.querySelector(".input_video");
  if (!videoElement) {
    console.error("📹 1: 未找到视频元素，初始化失败");
    throw new Error("未找到视频元素");
  }
  console.log("📹 1: 视频元素已成功获取");

  // 获取 canvas 元素并检查是否存在
  const canvasElement = document.querySelector(".output_canvas");
  if (!canvasElement) {
    console.error("📹 2: 未找到 Canvas 元素，初始化失败");
    throw new Error("未找到Canvas元素");
  }
  console.log("📹 2: Canvas 元素已成功获取");

  // 获取或创建控制面板元素
  let controlsElement = document.querySelector(".control-panel");
  if (!controlsElement) {
    console.log("📹 3: 未找到控制面板，将创建一个");
    controlsElement = addControlPanel();
  }
  console.log("📹 3: 控制面板元素:", controlsElement);

  const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
  if (!canvasCtx) {
    console.error("📹 4: 获取 Canvas 上下文失败，初始化失败");
    throw new Error("无法获取Canvas上下文");
  }
  console.log("📹 4: Canvas 上下文已成功获取");

  // 清除之前可能存在的实例
  if (window.handsInstance) {
    try {
      console.log("检测到之前的MediaPipe实例，尝试清理...");
      window.handsInstance.close();
      window.handsInstance = null;
    } catch (e) {
      console.warn("清理之前的实例时出错:", e);
    }
  }

  // 配置 MediaPipe 手部模型 - 修改为使用本地文件
  const config = {
    locateFile: (file) => {
      // 使用本地 MediaPipe 文件路径
      return `/mediapipe/hands/${file}`;
    },
  };
  console.log("📹 5: 配置文件路径已设置为本地路径");

  // 使用全局变量
  const controls = window.ControlUtils;
  const drawingUtils = window.drawingUtils;

  // 控制帧率
  const fpsControl = new controls.FPS();
  console.log("📹 6: FPS 控制已设置");

  // 处理 loading 动画
  const spinner = document.querySelector(".loading");
  if (spinner) {
    console.log("📹 7: 找到 loading 动画");
    spinner.ontransitionend = () => {
      spinner.style.display = "none";
      console.log("📹 8: loading 动画已隐藏");
    };
  }

  try {
    // 等待本地 Hands 脚本加载完成
    console.log("📹 9: 正在创建 MediaPipe Hands 实例...");
    
    // 检查全局 Hands 类是否可用
    if (typeof window.Hands === 'undefined') {
      throw new Error("本地 MediaPipe Hands 类未加载，请检查脚本引用");
    }
    
    // 使用全局的 Hands 类和常量
    const hands = new window.Hands(config);
    const mpHands = window; // HAND_CONNECTIONS 等常量在全局作用域
    
    console.log("📹 9: MediaPipe Hands 实例已创建");

    // 保存hands实例到全局变量，以便在组件卸载时释放
    window.handsInstance = hands;
    
    // 保存视频元素引用，以便在组件卸载时停止视频流
    window.videoElement = videoElement;

    // 处理视频帧
    function onResults(results) {
      try {
        // 初始化完成
        isInitializing.value = false;
        
        // 隐藏加载指示器
        if (spinner && spinner.style.display !== 'none') {
          spinner.style.display = 'none';
        }
        
        // 安全检查 - 如果组件已卸载或Canvas上下文不可用，则不处理结果
        if (!canvasCtx || !canvasElement) {
          console.warn("Canvas元素或上下文不可用，跳过处理结果");
          return;
        }
        
        document.body.classList.add("loaded");
        fpsControl.tick();
        
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

        if (results.multiHandLandmarks && results.multiHandedness) {
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
        }

        // 判断是否开始倒计时
        if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2) {
          countdownStarted.value = true;
        } else if (results.multiHandLandmarks) {
          countdownStarted.value = false;
        }
        
        canvasCtx.restore();
      } catch (error) {
        console.error("处理视频帧时出错:", error);
      }
    }

    hands.onResults(onResults);

    try {
      if (controlsElement) {
        new controls.ControlPanel(controlsElement, {
          selfieMode: true,
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
          .add([
            new controls.StaticText({ title: "MediaPipe Hands" }),
            fpsControl,
            new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
            new controls.SourcePicker({
              onFrame: async (input, size) => {
                try {
                  // 安全检查 - 确保组件还在挂载状态
                  if (!canvasElement || !hands) {
                    console.warn("Canvas元素或Hands实例不可用，跳过帧处理");
                    return;
                  }
                  
                  const aspect = size.height / size.width;
                  let width, height;
                  if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                  } else {
                    width = window.innerWidth;
                    height = width * aspect;
                  }
                  canvasElement.width = width;
                  canvasElement.height = height;
                  await hands.send({ image: input });
                } catch (error) {
                  console.error("处理视频帧时出错:", error);
                }
              },
            }),
            new controls.Slider({
              title: "Max Number of Hands",
              field: "maxNumHands",
              range: [1, 4],
              step: 1,
            }),
            new controls.Slider({
              title: "Model Complexity",
              field: "modelComplexity",
              discrete: ["Lite", "Full"],
            }),
            new controls.Slider({
              title: "Min Detection Confidence",
              field: "minDetectionConfidence",
              range: [0, 1],
              step: 0.01,
            }),
            new controls.Slider({
              title: "Min Tracking Confidence",
              field: "minTrackingConfidence",
              range: [0, 1],
              step: 0.01,
            }),
          ])
          .on((x) => {
            const options = x;
            if (videoElement) {
              videoElement.classList.toggle("selfie", options.selfieMode);
            }
            if (hands) {
              hands.setOptions(options);
            }
          });
      }
    } catch (error) {
      console.error("设置MediaPipe控制面板时出错:", error);
    }
  } catch (error) {
    console.error("初始化MediaPipe时出错:", error);
    throw error;
  }
}

watch(countdownStarted, (newVal) => {
  if (newVal) {
    startCountdown();
  } else {
    stopCountdown();
  }
});

onUnmounted(() => {
  console.log("清理检测页面资源...");
  
  // 防止重定向
  state.redirectTimeoutId = false;
  
  // 清除计时器
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("计时器已清理");
  }
  
  // 停止视频流
  try {
    if (window.videoElement && window.videoElement.srcObject) {
      // 获取所有轨道
      const tracks = window.videoElement.srcObject.getTracks();
      
      // 停止每个轨道
      tracks.forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn("停止视频轨道时出错:", e);
        }
      });
      
      // 清除视频源
      window.videoElement.srcObject = null;
      console.log("视频流已停止并清理");
    }
  } catch (e) {
    console.warn("停止视频流时出错:", e);
  }
  
  // 清理MediaPipe资源
  try {
    const handsInstance = window.handsInstance;
    
    // 立即将全局引用设为null，防止其他地方继续使用
    window.handsInstance = null;
    window.videoElement = null;
    
    if (handsInstance) {
      console.log("正在关闭MediaPipe实例...");
      
      // 尝试安全地关闭实例
      try {
        handsInstance.close()
          .then(() => console.log("MediaPipe Hands实例已成功关闭"))
          .catch(err => console.warn("关闭MediaPipe实例时出现可忽略的错误:", err));
      } catch (error) {
        console.warn("关闭MediaPipe实例时出现异常:", error);
      }
    }
  } catch (e) {
    console.warn("清理MediaPipe资源时发生异常:", e);
  }
  
  console.log("所有资源清理完成");
});
</script>

<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/deletingBG.png");
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
  max-width: 1200px;
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
  align-items: center;
}

/* 指导区域 */
.instruction-section {
  text-align: center;
  margin-bottom: 1rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
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
  width: 90%;
  max-width: 800px;
  position: relative;
  background: transparent;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.15);
  aspect-ratio: 16/9;
  margin: 0 auto;
  min-height: 300px;
  display: block;
}

.output_canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  //transform: scaleY(-1);
  background: transparent;
  border-radius: 16px;
  display: block;
}

.input_video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border-radius: 16px;
  display: block;
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
@media (max-width: 600px) {
  .camera-container {
    width: 95%;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .camera-container {
    width: 75%;
    max-width: 1000px;
  }
}

/* 超大屏幕优化 */
@media (min-width: 1600px) {
  .camera-container {
    width: 60%;
    max-width: 1200px;
  }
}
</style>
