<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：标题、Logo和返回按钮 - 新布局 -->
      <header class="header">
        <div class="header-content">
          <!-- 左侧标题 -->
          <h1 class="step-title">{{ t(`HandHygiene.step${currentStep}`) }}</h1>
          
          <!-- 中间Logo -->
          <div class="logo-container">
            <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
            <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
          </div>
          
          <!-- 右侧返回按钮 -->
          <div class="back-btn" @click="backHome">
            <img src="../assets/blueHome.png" alt="返回首页" />
          </div>
        </div>
      </header>

      <!-- 主要内容区域 - 具有响应式布局 -->
      <div class="main-section">
        <!-- 指导图片区域 -->
        <div class="guide-section">
          <div class="guide-image-container">
            <img class="guide-image" :src="getStepGif()" alt="洗手指导" />
            <div class="countdown-timer">
              <div class="timer-circle">
                <span>{{ countdownDisplay }}s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧区域：相机预览和评分 -->
        <div class="right-section">
          <!-- 相机预览区域 -->
          <div class="camera-section">
            <div class="camera-container">
              <video class="input_video"></video>
              <canvas class="output_canvas" width="1280px" height="720px"></canvas>
              <div class="loading" v-if="loading"></div>
              
              <!-- 添加卡尔曼滤波开关 -->
              <div class="filter-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="kalmanFilterEnabled" @change="toggleFilter">
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">{{ kalmanFilterEnabled ? '滤波开启' : '滤波关闭' }}</span>
              </div>
              
            </div>
            
            <!-- 将控制面板设为隐藏，但保留功能 -->
            <div class="controls-wrapper" style="display: none;">
              <div class="control-panel"></div>
            </div>
          </div>
          
          <!-- 评分反馈区域 -->
          <div class="feedback-card">
            <div class="feedback-title">
              {{ t(`HandHygiene.performance`) }}
            </div>
            <div class="feedback-rating">
              <el-rate v-model="resultValue"  />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 转场动画 - 修改为固定显示当前步骤的下一步 -->
    <transition name="fade">
      <div class="transition-overlay" v-show="showTransition">
        <div class="transition-content">
          <!-- 仅在不是最后一步时显示"下一步"文本 -->
          <div class="transition-next" v-if="transitionFromStep < 7">{{ t('HandHygiene.nextStep') || 'Next Step' }}</div>
          <!-- 只在不是最后一步时显示下一步骤名称 -->
          <div class="transition-result" v-if="transitionFromStep < 7">{{ t(`HandHygiene.step${transitionFromStep + 1}`) }}</div>
          <!-- 在最后一步显示完成文本 -->
          <div class="transition-result" v-if="transitionFromStep >= 7">{{ t('HandHygiene.completion') || 'Completion' }}</div>
          <div class="transition-spinner"></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as controls from "@mediapipe/control_utils";
import * as mpHands from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { createConnect, disconnect, sendLog } from "../services/socket";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import { getTime } from "../utils/formatData";
import { ElRate } from 'element-plus';

// 导入卡尔曼滤波器
import KalmanFilter from '../utils/KalmanFilter';

// 使用 vue-i18n
const { t } = useI18n();

// 导入所有GIF图片
import gif1 from '../assets/1.gif';
import gif2 from '../assets/2.gif';
import gif3 from '../assets/3.gif';
import gif4 from '../assets/4.gif';
import gif5 from '../assets/5.gif';
import gif6 from '../assets/6.gif';
import gif7 from '../assets/7.gif';

// 路由相关
const router = useRouter();
const route = useRoute();
const store = useStore();

// 当前步骤（从路由参数获取，默认为1）
const currentStep = computed(() => {
  const step = parseInt(route.params.step || "1");
  return isNaN(step) ? 1 : Math.min(Math.max(step, 1), 7);
});

// 下一个步骤的路由路径
const nextRoutePath = computed(() => {
  const nextStep = currentStep.value + 1;
  if (nextStep > 7) {
    return "/handwashingCompletion";
  }
  return `/hands/${nextStep}`;
});

// 获取当前步骤的GIF图片
function getStepGif() {
  const gifs = {
    1: gif1,
    2: gif2,
    3: gif3,
    4: gif4,
    5: gif5,
    6: gif6,
    7: gif7
  };
  return gifs[currentStep.value];
}

// 评分相关
const resultValue = ref(0);
const text = ref("");

// 倒计时逻辑
const percentage = ref(100);
const countdown = ref(3);
const countdownDisplay = ref(countdown.value);
const countdownStarted = ref(false);
let timer = null;

// 添加状态控制变量
const isEvaluating = ref(false); // 是否正在评估中
const isFinished = ref(false);   // 评估是否已完成

// 视频录制相关
const mediaRecorder = ref(null);
const recordedChunks = ref([]);
const videoUrl = ref("");
const downloadLink = ref(null);
const stream = ref();
const loading = ref(true);
const downloadName = ref();
const redirectTimeoutId = ref(true);
const resList = []; // 存储每次的结果

// 数据处理变量声明在顶层，以确保任何地方都能访问到它们
let storedData = [];
let newData = [];
let startNumber = 0;
let endNumber = 25;
let firstType = true;

// 添加转场效果变量
const showTransition = ref(false);
// 添加记录转场前步骤的变量
const transitionFromStep = ref(1);

// 历史轨迹和卡尔曼滤波相关变量
const handTrackHistory = ref([]);
const historyLength = 30; // 保存最近30帧的历史数据
const kalmanFilters = {}; // 存储每个关键点的卡尔曼滤波器
const filteredLandmarks = ref([]); // 存储滤波后的关键点
const trajectoryAnalysisEnabled = ref(true); // 是否启用轨迹分析
const kalmanFilterEnabled = ref(true); // 是否启用卡尔曼滤波
const motionPatterns = {
  1: "rub_palm_circular", // 掌心搓手
  2: "right_over_left", // 手背搓手-右手覆盖左手
  3: "left_over_right", // 手背搓手-左手覆盖右手
  4: "finger_interlocked", // 指缝相互揉搓
  5: "rotational_right_thumb", // 旋转揉搓右手拇指
  6: "rotational_left_thumb", // 旋转揉搓左手拇指
  7: "circular_wrist_motion" // 腕部揉搓
};

// 手部遮挡检测相关变量
const handOcclusionState = {
  Left: {
    occluded: false,
    lastSeenFrame: 0,
    confidence: 1.0,
    predictedLandmarks: null
  },
  Right: {
    occluded: false,
    lastSeenFrame: 0,
    confidence: 1.0,
    predictedLandmarks: null
  }
};
const occlusionThreshold = 5; // 连续多少帧不可见判定为遮挡
const maxPredictionFrames = 30; // 最多预测多少帧
let frameCounter = 0; // 全局帧计数器

// 媒体设置
const setupMedia = async () => {
  try {
    console.log("📹 访问摄像头...");
    const mediaRecorderOptions = { mimeType: "video/webm" };
    mediaRecorder.value = new MediaRecorder(stream.value, mediaRecorderOptions);
    
    // 注释掉视频数据收集和下载功能
    /*
    mediaRecorder.value.addEventListener("dataavailable", (event) => {
      console.log("🎥 录制数据可用", event);
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    });

    mediaRecorder.value.addEventListener("stop", async () => {
      console.log("⏹ 录制停止");
      const blob = new Blob(recordedChunks.value, { type: "video/webm" });
      console.log("💾 录制 Blob:", blob);
      const videoData = await readBlobAsBase64(blob);
      console.log("📂 录制转换完成");
      store.commit("user/addBlob", videoData);
      videoUrl.value = URL.createObjectURL(blob);
      downloadLink.value.click();
    });
    */
    
  } catch (error) {
    console.log("Error accessing media devices", error);
  }
};

// 将Blob转换为Base64 - 保留函数但注释其内部实现
async function readBlobAsBase64(blob) {
  /* 
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  */
  console.log("视频Base64转换功能已禁用");
  return ""; // 返回空字符串
}

// 开始录制 - 保留函数但注释其内部实现
const startRecording = () => {
  /*
  if (mediaRecorder.value && mediaRecorder.value.state === "inactive") {
    recordedChunks.value = [];
    mediaRecorder.value.start();
  }
  */
  console.log("视频录制功能已禁用");
};

// 停止录制 - 保留函数但注释其内部实现
const stopRecording = () => {
  /*
  if (mediaRecorder.value && mediaRecorder.value.state === "recording") {
    mediaRecorder.value.stop();
  }
  */
  console.log("视频录制功能已禁用");
};

// 开始倒计时
const startCountdown = () => {
  // 如果已经完成评估，则不再启动倒计时
  if (isFinished.value) return;
  
  startRecording();
  countdown.value = 3; // 重置倒计时为3秒
  countdownDisplay.value = countdown.value;
  isEvaluating.value = true; // 标记为评估中
  
  timer = setInterval(() => {
    countdown.value--;
    let str = Math.ceil((countdown.value / 3) * 100);
    percentage.value = str;
    countdownDisplay.value = countdown.value >= 0 ? countdown.value : "";
    if (countdown.value === 0) {
      clearInterval(timer);
      countdownDisplay.value = 0;
      setTimeout(() => {
        stopCountdown();
      }, 1000);
    }
  }, 1000);
};

// 检查双手是否有重叠，或者只检测到一只手
async function isOverlapping(landmarksList) {
  if (!landmarksList || landmarksList.length === 0) {
    console.log("🚨 未检测到手，直接判定为 False");
    return false;
  }

  if (landmarksList.length < 2) {
    console.log("⚠️ 仅检测到一只手，不参与重叠计算");
    return true;
  }

  console.log("🎯 开始检测双手是否重叠");

  // 计算每只手的边界框
  function getBoundingBox(landmarks) {
    const xCoords = landmarks.map(p => p.x);
    const yCoords = landmarks.map(p => p.y);
    return {
      minX: Math.min(...xCoords),
      maxX: Math.max(...xCoords),
      minY: Math.min(...yCoords),
      maxY: Math.max(...yCoords),
    };
  }

  const hand1Box = getBoundingBox(landmarksList[0]);
  const hand2Box = getBoundingBox(landmarksList[1]);

  // 判断两个手的边界框是否有重叠
  const overlapX = Math.max(0, Math.min(hand1Box.maxX, hand2Box.maxX) - Math.max(hand1Box.minX, hand2Box.minX));
  const overlapY = Math.max(0, Math.min(hand1Box.maxY, hand2Box.maxY) - Math.max(hand1Box.minY, hand2Box.minY));

  const Overlapping = overlapX > 0 && overlapY > 0;
  console.log("🖐 双手是否重叠:", Overlapping);
  return Overlapping;
}

// 监视路由参数变化，当步骤改变时重置状态
watch(() => route.params.step, (newStep, oldStep) => {
  if (newStep !== oldStep) {
    console.log(`检测到步骤从 ${oldStep} 变为 ${newStep}，准备重置状态`);
    // 重置状态
    isEvaluating.value = false;
    isFinished.value = false;
    countdownStarted.value = false;
    resultValue.value = 0;
    text.value = "";
    countdown.value = 3;
    countdownDisplay.value = countdown.value;
    percentage.value = 100;
    resList.length = 0;
    
    // 重置转场效果状态
    showTransition.value = false;
    
    // 重置数据处理变量
    storedData = [];
    newData = [];
    startNumber = 0;
    endNumber = 25;
    firstType = true;
  }
}, { immediate: true });

// 停止倒计时，处理评分和跳转
async function stopCountdown() {
  try {
    // 标记为已完成评估，阻止进一步检测
    isEvaluating.value = false;
    isFinished.value = true;
    
    clearInterval(timer);
    countdownDisplay.value = 0;
    console.log("resList:", resList);
    
    // 记录数据
    sendLog("info", `resList: ${JSON.stringify(resList)}`);
    
    // 计算true和false总数
    const totalCount = resList.length;
    const trueCount = resList.filter(ans => ans === true).length;
    const trueRatio = totalCount > 0 ? (trueCount / totalCount) * 100 : 0;
    
    console.log(`统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);
    sendLog("info", `统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);
    
    // 评分逻辑
    if (trueRatio >= 80) {
      text.value = "PERFECT";
      resultValue.value = Math.round(trueRatio / 20);
    } else if (trueRatio >= 40) {
      text.value = "GOOD"; 
      resultValue.value = Math.round(trueRatio / 20);
    } else {
      text.value = "Need Improvement";
      resultValue.value = Math.round(trueRatio / 20);
    }
    
    console.log(`评分结果: ${text.value}, 分数: ${resultValue.value}`);
    sendLog("info", `评分结果: ${text.value}, 分数: ${resultValue.value}`);

    try {
      // 存储评分
      await store.dispatch("user/rating", {
        id: sessionStorage.getItem("accountSerialNumber") || localStorage.getItem("accountSerialNumber"),
        rating: text.value,
        points: parseFloat((trueRatio / 7).toFixed(3)),
        step_video_file: `${downloadName.value}-step${currentStep.value}`,
      });
      console.log("成功保存评分数据");
      
      // 恢复自动跳转功能，但添加转场效果
      if (redirectTimeoutId.value) {
        console.log(`准备跳转到下一步: ${nextRoutePath.value}`);
        
        // 准备跳转路径和参数
        const targetPath = nextRoutePath.value;
        
        // 判断是否是最后一步（第7步）- 如果是，直接跳转不显示转场
        const isLastStep = currentStep.value >= 7;
        
        if (isLastStep) {
          // 最后一步直接跳转，无需转场
          console.log('最后一步，直接跳转到完成页面');
          router.push({
            path: targetPath,
            replace: true
          });
        } else {
          // 不是最后一步，显示转场效果
          // 保存当前步骤，用于显示正确的下一步信息
          transitionFromStep.value = currentStep.value;
          showTransition.value = true;
          console.log("转场效果已激活:", showTransition.value);
          
          // 延时执行路由跳转，确保转场动画完全显示后再跳转
          setTimeout(() => {
            try {
              // 在路由跳转前确保没有任何下一步的信息显示
              const executeNavigation = () => {
                console.log(`正在跳转到: ${targetPath}`);
                showTransition.value = false; // 彻底确保转场隐藏
                router.push({
                  path: targetPath,
                  replace: true  // 使用replace模式避免历史堆栈问题
                });
              };
              
              // 先隐藏转场动画，然后执行跳转
              showTransition.value = false;
              
              // 给DOM足够时间完全更新，然后再跳转
              setTimeout(executeNavigation, 100);
            } catch (routeError) {
              console.error("路由跳转出错:", routeError);
              // 尝试使用window.location作为备选方案
              showTransition.value = false; // 如果跳转出错，手动隐藏转场效果
              window.location.href = `/#${targetPath}`;
            }
          }, 1500); // 减少转场时间，让用户更快看到新内容
        }
      } else {
        console.log("跳转已被取消");
      }
      
    } catch (actionError) {
      console.error("保存评分数据失败:", actionError);
      
      // 恢复评分失败后的自动跳转，但添加转场效果
      if (redirectTimeoutId.value) {
        console.log("尽管评分保存失败，仍尝试跳转到下一步");
        
        const targetPath = nextRoutePath.value;
        
        // 判断是否是最后一步（第7步）
        const isLastStep = currentStep.value >= 7;
        
        if (isLastStep) {
          // 最后一步直接跳转，无需转场
          router.push({
            path: targetPath,
            replace: true
          });
        } else {
          // 保存当前步骤，用于显示正确的下一步信息
          transitionFromStep.value = currentStep.value;
          // 显示转场效果
          showTransition.value = true;
          console.log("转场效果已激活（失败场景）:", showTransition.value);
          
          setTimeout(() => {
            // 在路由跳转前立即隐藏转场效果
            showTransition.value = false;
            
            // 给DOM足够时间更新，然后再跳转
            setTimeout(() => {
              router.push({
                path: targetPath,
                replace: true
              });
            }, 100);
          }, 1500);
        }
      }
    }
  } catch (e) {
    console.error("停止倒计时过程中出错:", e);
    
    // 恢复故障安全跳转，但添加转场效果
    if (redirectTimeoutId.value) {
      console.log("尝试进行故障安全跳转");
      
      const targetPath = nextRoutePath.value;
      
      // 判断是否是最后一步（第7步）
      const isLastStep = currentStep.value >= 7;
      
      if (isLastStep) {
        // 最后一步直接跳转，无需转场
        window.location.href = `/#${targetPath}`;
      } else {
        // 保存当前步骤，用于显示正确的下一步信息
        transitionFromStep.value = currentStep.value;
        // 显示转场效果
        showTransition.value = true;
        console.log("转场效果已激活（故障安全）:", showTransition.value);
        
        setTimeout(() => {
          showTransition.value = false; // 确保清除转场状态
          
          // 给DOM足够时间更新，然后再跳转
          setTimeout(() => {
            window.location.href = `/#${targetPath}`;
          }, 100);
        }, 1500);
      }
    }
  }
}

// 组件挂载
onMounted(() => {
  // 确保转场效果初始为隐藏状态
  console.log("组件挂载，初始化转场效果状态");
  showTransition.value = false;
  // 初始化转场步骤值
  transitionFromStep.value = currentStep.value;
  
  downloadName.value = getTime(
    sessionStorage.getItem("accountSerialNumber") || localStorage.getItem("accountSerialNumber")
  );
  
  // 重置评估状态
  isEvaluating.value = false;
  isFinished.value = false;
  countdownStarted.value = false;
  resultValue.value = 0;
  text.value = "";
  countdown.value = 3;
  countdownDisplay.value = countdown.value;
  percentage.value = 100;
  resList.length = 0; // 清空结果列表
  
  console.log(`步骤${currentStep.value}组件已挂载，状态已重置，准备开始新的评估`);
  
  // 使用setTimeout延迟初始化MediaPipe，确保DOM已完全渲染
  setTimeout(() => {
    initializeMediaPipe();
  }, 300);
});

// 将MediaPipe初始化提取为一个独立函数
function initializeMediaPipe() {
  console.log("初始化MediaPipe和卡尔曼滤波器...");
  
  // 初始化卡尔曼滤波器
  initializeKalmanFilters();
  
  // 媒体设置
  const videoElement = document.getElementsByClassName("input_video")[0];
  if (!videoElement) {
    console.error("无法找到视频元素，初始化失败");
    return;
  }
  
  const canvasElement = document.getElementsByClassName("output_canvas")[0];
  if (!canvasElement) {
    console.error("无法找到canvas元素，初始化失败");
    return;
  }
  
  const controlsElement = document.getElementsByClassName("control-panel")[0];
  if (!controlsElement) {
    console.warn("无法找到控制面板元素，但可以继续");
  }
  
  const canvasCtx = canvasElement.getContext("2d");
  if (!canvasCtx) {
    console.error("无法获取canvas上下文，初始化失败");
    return;
  }
  
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
  
  const config = {
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    },
  };
  
  console.log("创建新的MediaPipe Hands实例...");
  const hands = new mpHands.Hands(config);
  // 保存hands实例到全局变量，以便在组件卸载时释放
  window.handsInstance = hands;
  // 保存视频元素引用，以便在组件卸载时停止视频流
  window.videoElement = videoElement;
  
  stream.value = canvasElement.captureStream();
  setupMedia();
  
  const fpsControl = new controls.FPS();
  
  // 处理MediaPipe结果
  async function onResults(results) {
    loading.value = false;
    
    // 安全检查 - 如果组件已卸载或Canvas上下文不可用，则不处理结果
    if (!canvasCtx || !canvasElement) {
      console.warn("Canvas元素或上下文不可用，跳过处理结果");
      return;
    }
    
    try {
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
  
      // 如果评估已完成，只显示画面不做检测
      if (isFinished.value) {
        canvasCtx.restore();
        return;
      }
  
      // 准备组合数据，包括遮挡预测
      const combinedData = {};
      
      // 检测到手的情况
      if (results.multiHandLandmarks && results.multiHandedness && results.multiHandLandmarks.length > 0) {
        // 设置组合数据结构
        results.multiHandedness.forEach((item) => {
          const label = item.label;
          if (!combinedData[label]) {
            combinedData[label] = [];
          }
        });

        // 如果检测到手部且未开始评估，自动开始倒计时
        if (!isEvaluating.value && !isFinished.value && !countdownStarted.value) {
          console.log("检测到手部，自动开始倒计时");
          countdownStarted.value = true;
        }

        // 填充组合数据
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const label = results.multiHandedness[i].label;
          const keypoints = results.multiHandLandmarks[i].map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z,
          }));
          const score = results.multiHandedness[i].score;
          const handedness = label;

          if (!combinedData[label]) {
            combinedData[label] = [];
          }

          combinedData[label].push({
            keypoints,
            score,
            handedness,
          });
        }
        
        // 应用卡尔曼滤波处理关键点，包括预测遮挡手部
        const filteredData = applyKalmanFilter(combinedData);
        
        // 轮流处理左右手的数据
        for (let handType of ['Left', 'Right']) {
          if (filteredData[handType] && filteredData[handType].length > 0) {
            const handData = filteredData[handType][0];
            const isCurrentRightHand = handType === 'Right';
            const landmarks = handData.keypoints.map(p => ({x: p.x, y: p.y, z: p.z}));
            const isOccluded = handData.isOccluded === true;
            
            // 使用不同颜色绘制检测到的手和预测的手
            const connectionColor = isOccluded ? 
                                   (isCurrentRightHand ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)") : 
                                   (isCurrentRightHand ? "#00FF00" : "#FF0000");
            
            const landmarkColor = isOccluded ?
                                 (isCurrentRightHand ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)") :
                                 (isCurrentRightHand ? "#FF0000" : "#00FF00");
            
            // 绘制手部轮廓
            drawingUtils.drawConnectors(
              canvasCtx,
              landmarks,
              mpHands.HAND_CONNECTIONS,
              { color: connectionColor }
            );
            
            // 对于预测的手，使用较小的点和半透明样式
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
              color: landmarkColor,
              fillColor: isCurrentRightHand ? "#FF0000" : "#00FF00",
              radius: (data) => {
                const baseSize = isOccluded ? 0.7 : 1.0;
                return drawingUtils.lerp(data.from.z, -0.15, 0.1, 10 * baseSize, 1 * baseSize);
              },
            });
            
            // 如果是预测的手，添加提示文本
            if (isOccluded) {
              canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              canvasCtx.font = '16px Arial';
              canvasCtx.fillText(`预测的${handType}手 (${(handData.score * 100).toFixed(0)}%)`, 
                                landmarks[0].x * canvasElement.width, 
                                landmarks[0].y * canvasElement.height - 10);
            }
          }
        }
        
        // 存储历史轨迹数据，包括预测的数据
        handTrackHistory.value.push(JSON.parse(JSON.stringify(filteredData || combinedData)));
        
        // 保持固定历史长度
        if (handTrackHistory.value.length > historyLength) {
          handTrackHistory.value.shift();
        }
        
        // 如果正在评估中，则继续检测手势
        if (isEvaluating.value && !isFinished.value) {
          // 提取手部数据，优先使用实际检测到的手，如果没有则使用预测数据
          const leftHand = getHandLandmarks(filteredData, 'Left');
          const rightHand = getHandLandmarks(filteredData, 'Right');
          
          const landmarksList = [];
          if (leftHand) landmarksList.push(leftHand);
          if (rightHand) landmarksList.push(rightHand);

          try {
            // 修改重叠检测，考虑预测的手
            let overlap = false;
            
            // 如果有两只手，直接检测重叠
            if (landmarksList.length === 2) {
              overlap = await isOverlapping(landmarksList);
            } 
            // 只有一只手，可能另一只手被遮挡
            else if (landmarksList.length === 1) {
              // 检查是否有一只手被预测
              const leftOccluded = handOcclusionState['Left'].occluded && handOcclusionState['Left'].confidence > 0.5;
              const rightOccluded = handOcclusionState['Right'].occluded && handOcclusionState['Right'].confidence > 0.5;
              
              // 如果有一只手被预测，并且预测置信度足够高，假设重叠成立
              if (leftOccluded || rightOccluded) {
                overlap = true;
                console.log("一只手可见，另一只手被预测，假设重叠成立");
              }
            }
            
            // 使用历史轨迹分析和手部重叠判断相结合
            if (!overlap) {
              console.log("⚠️ 未检测到手或双手摊开，直接判定 FALSE");
              resList.push(false);
            } else {
              console.log("✅ 正常洗手，执行后续检测");
              
              // 增加：使用轨迹分析辅助判断
              if (trajectoryAnalysisEnabled.value && handTrackHistory.value.length >= 10) {
                const trajectoryMatch = analyzeHandTrajectory(currentStep.value);
                console.log(`👉 轨迹分析结果: ${trajectoryMatch ? "匹配" : "不匹配"}`);
                
                // 如果轨迹分析非常确定(匹配或不匹配)，直接使用其结果
                // 否则采用原有服务器分析方式
                if (trajectoryMatch) {
                  console.log("📊 轨迹分析判定为匹配，直接加入TRUE结果");
                  resList.push(true);
                } else {
                  // 不匹配或不确定时，使用原有服务器分析
                  storeDataEverySecond(filteredData || combinedData);
                }
              } else {
                // 轨迹分析未启用或数据不足，使用原有服务器分析
                storeDataEverySecond(filteredData || combinedData);
              }
            }
          } catch (error) {
            console.error("手部检测过程中出错:", error);
            resList.push(false);
          }
        }
      } 
      // 没有检测到手的情况
      else {
        // 尝试使用预测来填补检测缺失
        const filteredData = applyKalmanFilter(combinedData);
        
        // 检查是否有预测的手部数据
        const hasPredictedHands = (filteredData && 
                                 ((filteredData['Left'] && filteredData['Left'].length > 0) || 
                                  (filteredData['Right'] && filteredData['Right'].length > 0)));
        
        // 如果有预测的手部，则绘制它们
        if (hasPredictedHands) {
          // 轮流处理左右手的数据
          for (let handType of ['Left', 'Right']) {
            if (filteredData[handType] && filteredData[handType].length > 0) {
              const handData = filteredData[handType][0];
              const isCurrentRightHand = handType === 'Right';
              const landmarks = handData.keypoints.map(p => ({x: p.x, y: p.y, z: p.z}));
              
              // 绘制预测的手部
              drawingUtils.drawConnectors(
                canvasCtx,
                landmarks,
                mpHands.HAND_CONNECTIONS,
                { color: isCurrentRightHand ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)" }
              );
              
              drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isCurrentRightHand ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)",
                fillColor: isCurrentRightHand ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)",
                radius: (data) => {
                  return drawingUtils.lerp(data.from.z, -0.15, 0.1, 7, 1) * 0.7;
                },
              });
              
              // 显示提示文本
              canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              canvasCtx.font = '16px Arial';
              canvasCtx.fillText(`预测的${handType}手 (${(handData.score * 100).toFixed(0)}%)`, 
                                landmarks[0].x * canvasElement.width, 
                                landmarks[0].y * canvasElement.height - 10);
            }
          }
          
          // 保存预测数据到历史轨迹
          handTrackHistory.value.push(JSON.parse(JSON.stringify(filteredData)));
          if (handTrackHistory.value.length > historyLength) {
            handTrackHistory.value.shift();
          }
          
          // 如果正在评估中，使用预测数据继续分析
          if (isEvaluating.value && !isFinished.value) {
            const leftHand = getHandLandmarks(filteredData, 'Left');
            const rightHand = getHandLandmarks(filteredData, 'Right');
            
            if (leftHand || rightHand) {
              // 如果预测置信度足够高，继续进行分析
              const highConfidence = (handOcclusionState['Left'].confidence > 0.6 || 
                                    handOcclusionState['Right'].confidence > 0.6);
              
              if (highConfidence && trajectoryAnalysisEnabled.value && handTrackHistory.value.length >= 10) {
                const trajectoryMatch = analyzeHandTrajectory(currentStep.value);
                console.log(`👉 [预测模式] 轨迹分析结果: ${trajectoryMatch ? "匹配" : "不匹配"}`);
                
                if (trajectoryMatch) {
                  console.log("📊 [预测模式] 轨迹分析判定为匹配，直接加入TRUE结果");
                  resList.push(true);
                } else {
                  console.log("⚠️ [预测模式] 轨迹分析判定为不匹配");
                  resList.push(false);
                }
              } else {
                console.log("⚠️ [预测模式] 预测置信度不足或轨迹数据不足");
                // 在置信度不足时不添加结果，避免误判
              }
            } else {
              console.log("未检测到手，重置数据处理索引");
              if (startNumber !== undefined && endNumber !== undefined) {
                startNumber = 0;
                endNumber = 25;
              }
            }
          }
        } else {
          // 没有预测的手部数据
          if (isEvaluating.value && !isFinished.value) {
            console.log("未检测到手");
            if (startNumber !== undefined && endNumber !== undefined) {
              startNumber = 0;
              endNumber = 25;
            }
          }
        }
      }
      
      canvasCtx.restore();
    } catch (error) {
      console.error("处理视频帧时出错:", error);
    }
  }
  
  // 设置控制面板
  try {
    hands.onResults(onResults);
    
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
              // 安全检查 - 确保组件还在挂载状态
              if (!canvasElement || !hands) {
                console.warn("Canvas元素或Hands实例不可用，跳过帧处理");
                return;
              }
              
              try {
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
    
    // 添加: 确保Socket监视器不显示
    if (window.parent && window.parent.document) {
      // 尝试找到监视器并隐藏它
      const monitorElements = window.parent.document.querySelectorAll('.monitor-container, .monitor-controls');
      monitorElements.forEach(el => {
        if (el && el.style) {
          el.style.display = 'none';
        }
      });
    }
  } catch (error) {
    console.error("设置MediaPipe控制面板时出错:", error);
    loading.value = false;
  }
}

// 数据存储和处理
async function storeDataEverySecond(results) {
  storedData.push(results);
  
  if (firstType) {
    if (storedData.length > 25) {
      newData = storedData.slice(startNumber, endNumber);
      try {
        const res = await createConnect(newData, currentStep.value);
        console.log("服务器返回:", res);
        if (res && res.ans !== undefined) {
          resList.push(res.ans === 'True');
        }
      } catch (error) {
        console.error('Error during socket communication:', error);
        // 发生错误时添加默认的False结果，确保不会阻塞
        resList.push(false);
      }
      firstType = false;
      newData = [];
      storedData.shift();
    }
  } else {
    storedData.shift();
    newData = storedData.slice(startNumber, endNumber);
    try {
      const res = await createConnect(newData, currentStep.value);
      console.log("服务器返回:", res);
      if (res && res.ans !== undefined) {
        resList.push(res.ans === 'True');
      }
    } catch (error) {
      console.error('Error during socket communication:', error);
      // 发生错误时添加默认的False结果，确保不会阻塞
      resList.push(false);
    }
    newData = [];
  }
}

// 监视倒计时状态
watch(countdownStarted, (newVal) => {
  if (newVal && !isFinished.value) {
    startCountdown();
  }
});

// 返回首页
const backHome = () => {
  redirectTimeoutId.value = false;
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  localStorage.removeItem("accountSerialNumber");
  sessionStorage.removeItem("accountSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};

// 组件卸载前清理资源
onUnmounted(() => {
  console.log(`正在清理Hands(步骤${currentStep.value})组件资源...`);
  
  // 标记资源正在清理中，避免新的处理
  const isCleaningUp = true;
  
  // 0. 先清除计时器和其他非MediaPipe资源
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("计时器已清理");
  }
  
  // 1. 停止视频流
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
  
  // 2. 停止MediaRecorder录制 - 虽然录制功能已禁用，但仍需清理资源
  try {
    if (mediaRecorder.value && mediaRecorder.value.state === "recording") {
      mediaRecorder.value.stop();
      console.log("MediaRecorder已停止");
    }
  } catch (e) {
    console.warn("停止MediaRecorder时出错:", e);
  }
  
  // 3. 清理stream资源
  try {
    if (stream.value) {
      const tracks = stream.value.getTracks();
      tracks.forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn("停止Track时出错:", e);
        }
      });
      stream.value = null;
      console.log("Stream流已停止");
    }
  } catch (e) {
    console.warn("清理Stream时出错:", e);
  }
  
  // 4. 立即释放Blob URL资源
  try {
    if (videoUrl.value) {
      URL.revokeObjectURL(videoUrl.value);
      console.log("Blob URL已释放");
      videoUrl.value = "";
    }
  } catch (e) {
    console.warn("释放Blob URL时出错:", e);
  }
  
  // 5. 清空数据数组
  recordedChunks.value = [];
  if (Array.isArray(resList)) {
    resList.length = 0;
  }
  
  // 6. 最后清理MediaPipe hands实例
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
  
  // 恢复Socket监视按钮显示
  if (window.parent && window.parent.document) {
    const monitorButtons = window.parent.document.querySelectorAll('.monitor-controls');
    monitorButtons.forEach(el => {
      if (el && el.style) {
        el.style.display = ''; // 恢复默认显示
      }
    });
  }
});

// 下一个步骤的标题 - 不再使用动态获取，而是从i18n直接获取
function getNextStepTitle() {
  return ""; // 返回空值，不再显示下一步标题
}

// 初始化卡尔曼滤波器（为每个手的每个关键点创建一个滤波器）
function initializeKalmanFilters() {
  // 为左右手各21个关键点创建滤波器
  for (let hand of ['Left', 'Right']) {
    kalmanFilters[hand] = [];
    for (let i = 0; i < 21; i++) {
      // 为x, y, z三个坐标分别创建滤波器
      kalmanFilters[hand][i] = {
        x: new KalmanFilter({R: 0.01, Q: 0.1}), // 测量噪声R小，过程噪声Q适中
        y: new KalmanFilter({R: 0.01, Q: 0.1}),
        z: new KalmanFilter({R: 0.05, Q: 0.1})  // z方向噪声较大
      };
    }
  }
  console.log("卡尔曼滤波器初始化完成");
}

// 应用卡尔曼滤波器处理手部关键点，现在增加预测功能
function applyKalmanFilter(handData) {
  if (!handData) return null;
  
  frameCounter++; // 每次处理都增加帧计数
  const result = {};
  
  // 处理每只手的数据
  for (let hand of ['Left', 'Right']) {
    // 检查手是否存在于当前帧
    const handExists = handData[hand] && handData[hand].length > 0;
    
    // 更新手部遮挡状态
    if (handExists) {
      // 手部可见，重置遮挡状态
      handOcclusionState[hand].occluded = false;
      handOcclusionState[hand].lastSeenFrame = frameCounter;
      handOcclusionState[hand].confidence = 1.0;
    } else {
      // 检查是否满足遮挡条件
      const framesSinceLastSeen = frameCounter - handOcclusionState[hand].lastSeenFrame;
      if (framesSinceLastSeen > occlusionThreshold) {
        handOcclusionState[hand].occluded = true;
        // 随着预测时间增加，降低置信度
        if (framesSinceLastSeen <= maxPredictionFrames) {
          handOcclusionState[hand].confidence = Math.max(0.1, 1 - (framesSinceLastSeen / maxPredictionFrames));
        } else {
          handOcclusionState[hand].confidence = 0; // 超过最大预测帧数，不再预测
        }
      }
    }
    
    // 初始化结果对象
    if (!result[hand]) {
      result[hand] = [];
    }
    
    // 如果手部存在，正常进行滤波
    if (handExists) {
      // 复制手部信息
      result[hand] = JSON.parse(JSON.stringify(handData[hand]));
      
      // 对每个关键点应用滤波
      for (let handIndex = 0; handIndex < handData[hand].length; handIndex++) {
        const keypoints = handData[hand][handIndex].keypoints;
        
        // 创建滤波后的关键点数组
        const filteredKeypoints = [];
        
        // 对每个关键点进行滤波
        for (let i = 0; i < keypoints.length; i++) {
          if (!kalmanFilters[hand] || !kalmanFilters[hand][i]) continue;
          
          const point = keypoints[i];
          
          // 根据开关决定是否应用滤波
          if (kalmanFilterEnabled.value) {
            // 应用滤波
            const filteredX = kalmanFilters[hand][i].x.filter(point.x);
            const filteredY = kalmanFilters[hand][i].y.filter(point.y);
            const filteredZ = kalmanFilters[hand][i].z.filter(point.z);
            
            // 存储滤波后的点
            filteredKeypoints.push({
              x: filteredX,
              y: filteredY,
              z: filteredZ
            });
          } else {
            // 不应用滤波，直接使用原始点
            // 但仍让数据通过滤波器以更新其状态（不使用结果）
            kalmanFilters[hand][i].x.filter(point.x);
            kalmanFilters[hand][i].y.filter(point.y);
            kalmanFilters[hand][i].z.filter(point.z);
            
            // 使用原始点
            filteredKeypoints.push({
              x: point.x,
              y: point.y, 
              z: point.z
            });
          }
        }
        
        // 替换为滤波后的关键点
        result[hand][handIndex].keypoints = filteredKeypoints;
        
        // 保存当前滤波后的关键点用于未来预测
        handOcclusionState[hand].predictedLandmarks = [...filteredKeypoints];
      }
    } 
    // 手部被遮挡且在预测时间窗口内，使用预测值
    else if (handOcclusionState[hand].occluded && handOcclusionState[hand].confidence > 0) {
      // 如果有历史预测值，使用卡尔曼滤波继续预测
      if (handOcclusionState[hand].predictedLandmarks) {
        const predictedKeypoints = [];
        
        // 对每个关键点进行预测（仅使用上次状态和卡尔曼滤波器的预测能力）
        for (let i = 0; i < handOcclusionState[hand].predictedLandmarks.length; i++) {
          if (!kalmanFilters[hand] || !kalmanFilters[hand][i]) continue;
          
          const lastPoint = handOcclusionState[hand].predictedLandmarks[i];
          
          // 仅在启用滤波时进行预测
          if (kalmanFilterEnabled.value) {
            // 纯预测模式 - 使用滤波器的lastValue，并微调状态
            const predictedX = kalmanFilters[hand][i].x.filter(lastPoint.x);
            const predictedY = kalmanFilters[hand][i].y.filter(lastPoint.y);
            const predictedZ = kalmanFilters[hand][i].z.filter(lastPoint.z);
            
            predictedKeypoints.push({
              x: predictedX,
              y: predictedY,
              z: predictedZ
            });
          } else {
            // 滤波禁用时，保持最后已知位置不变
            predictedKeypoints.push({
              x: lastPoint.x,
              y: lastPoint.y,
              z: lastPoint.z
            });
          }
        }
        
        // 更新预测关键点
        handOcclusionState[hand].predictedLandmarks = predictedKeypoints;
        
        // 创建预测的手部数据
        result[hand].push({
          keypoints: predictedKeypoints,
          score: handOcclusionState[hand].confidence, // 使用递减的置信度
          handedness: hand,
          isOccluded: true // 标记为预测的遮挡数据
        });
        
        console.log(`预测${hand}手关键点，置信度: ${handOcclusionState[hand].confidence.toFixed(2)}`);
      }
    }
  }
  
  return result;
}

// 切换卡尔曼滤波状态
function toggleFilter() {
  console.log(`${kalmanFilterEnabled.value ? '启用' : '禁用'}卡尔曼滤波`);
  
  // 如果关闭滤波，重置所有滤波器状态
  if (!kalmanFilterEnabled.value) {
    for (let hand of ['Left', 'Right']) {
      for (let i = 0; i < 21; i++) {
        if (kalmanFilters[hand] && kalmanFilters[hand][i]) {
          kalmanFilters[hand][i].x.reset();
          kalmanFilters[hand][i].y.reset();
          kalmanFilters[hand][i].z.reset();
        }
      }
    }
  }
}

// 分析手部运动轨迹
function analyzeHandTrajectory(currentStep) {
  if (handTrackHistory.value.length < 10) return false; // 数据不足
  
  // 获取最近的10帧数据进行分析
  const recentFrames = handTrackHistory.value.slice(-10);
  
  // 基于当前步骤选择匹配的动作模式
  const targetPattern = motionPatterns[currentStep];
  let matchScore = 0;
  
  switch(targetPattern) {
    case "rub_palm_circular": // 步骤1: 掌心搓手
      matchScore = detectCircularPalmRubbing(recentFrames);
      break;
    case "right_over_left": // 步骤2: 右手搓左手背
      matchScore = detectHandOverHand(recentFrames, "Right", "Left");
      break;
    case "left_over_right": // 步骤3: 左手搓右手背
      matchScore = detectHandOverHand(recentFrames, "Left", "Right");
      break;
    case "finger_interlocked": // 步骤4: 指缝相互揉搓
      matchScore = detectInterlockingFingers(recentFrames);
      break;
    case "rotational_right_thumb": // 步骤5: 旋转揉搓右手拇指
      matchScore = detectThumbRotation(recentFrames, "Right");
      break;
    case "rotational_left_thumb": // 步骤6: 旋转揉搓左手拇指
      matchScore = detectThumbRotation(recentFrames, "Left");
      break;
    case "circular_wrist_motion": // 步骤7: 腕部揉搓
      matchScore = detectWristMotion(recentFrames);
      break;
    default:
      matchScore = 0.5; // 默认中等匹配度
  }
  
  console.log(`步骤${currentStep}动作匹配度: ${matchScore.toFixed(2)}`);
  
  // 匹配度大于0.7认为是正确动作
  return matchScore > 0.7;
}

// 检测掌心环形搓洗动作
function detectCircularPalmRubbing(frames) {
  try {
    // 提取掌心轨迹点（手掌中心关键点，通常为9号点）
    const palmTrajectories = {
      Left: frames.map(frame => {
        if (frame.Left && frame.Left[0] && frame.Left[0].keypoints) 
          return frame.Left[0].keypoints[9];
        return null;
      }).filter(Boolean),
      
      Right: frames.map(frame => {
        if (frame.Right && frame.Right[0] && frame.Right[0].keypoints) 
          return frame.Right[0].keypoints[9];
        return null;
      }).filter(Boolean)
    };
    
    // 如果没有足够的轨迹点，返回低匹配度
    if (palmTrajectories.Left.length < 5 || palmTrajectories.Right.length < 5) {
      return 0.3;
    }
    
    // 检测圆形运动
    const leftCircularity = calculateCircularity(palmTrajectories.Left);
    const rightCircularity = calculateCircularity(palmTrajectories.Right);
    
    // 计算手掌距离 - 掌心搓手手掌应该接近
    const palmDistance = calculateAverageDistance(frames, 9, 9);
    const distanceScore = palmDistance < 0.15 ? 1.0 : (palmDistance < 0.3 ? 0.5 : 0.1);
    
    // 计算最终匹配度
    return (leftCircularity + rightCircularity) * 0.4 + distanceScore * 0.2;
  } catch (error) {
    console.error("检测掌心环形搓洗动作时出错:", error);
    return 0.2; // 出错时返回低匹配度
  }
}

// 检测一只手搓另一只手的动作
function detectHandOverHand(frames, topHand, bottomHand) {
  try {
    // 检查手的上下位置关系
    let correctPositionCount = 0;
    let frameCount = 0;
    
    frames.forEach(frame => {
      if (frame[topHand] && frame[topHand][0] && 
          frame[bottomHand] && frame[bottomHand][0]) {
        
        // 获取两只手的Y轴中心位置
        const topHandY = frame[topHand][0].keypoints.reduce((sum, point) => sum + point.y, 0) / 
                        frame[topHand][0].keypoints.length;
        const bottomHandY = frame[bottomHand][0].keypoints.reduce((sum, point) => sum + point.y, 0) / 
                           frame[bottomHand][0].keypoints.length;
        
        // 检查上下位置关系
        if (topHandY < bottomHandY) {
          correctPositionCount++;
        }
        
        frameCount++;
      }
    });
    
    // 计算位置关系正确的帧比例
    const positionScore = frameCount > 0 ? correctPositionCount / frameCount : 0;
    
    // 检测横向摩擦运动
    const horizontalMotion = detectHorizontalMotion(frames, topHand);
    
    // 计算手掌距离 - 手背搓手时手掌应该较近
    const palmDistance = calculateAverageDistance(frames, 9, 9);
    const distanceScore = palmDistance < 0.2 ? 1.0 : (palmDistance < 0.4 ? 0.5 : 0.1);
    
    // 计算最终匹配度
    return positionScore * 0.5 + horizontalMotion * 0.3 + distanceScore * 0.2;
  } catch (error) {
    console.error(`检测${topHand}手搓${bottomHand}手动作时出错:`, error);
    return 0.2;
  }
}

// 检测指缝相互揉搓
function detectInterlockingFingers(frames) {
  try {
    // 检测指尖之间的距离变化
    let fingerDistanceChanges = 0;
    let prevDistances = null;
    
    frames.forEach(frame => {
      if (frame.Left && frame.Left[0] && frame.Right && frame.Right[0]) {
        // 计算左右手各指尖之间的距离
        const distances = [];
        
        // 指尖关键点索引(除拇指外): 8, 12, 16, 20
        const fingerTips = [8, 12, 16, 20];
        
        fingerTips.forEach(leftTip => {
          fingerTips.forEach(rightTip => {
            const leftPoint = frame.Left[0].keypoints[leftTip];
            const rightPoint = frame.Right[0].keypoints[rightTip];
            
            if (leftPoint && rightPoint) {
              const distance = Math.sqrt(
                Math.pow(leftPoint.x - rightPoint.x, 2) +
                Math.pow(leftPoint.y - rightPoint.y, 2) +
                Math.pow(leftPoint.z - rightPoint.z, 2)
              );
              distances.push(distance);
            }
          });
        });
        
        // 比较与上一帧的距离变化
        if (prevDistances) {
          const changes = distances.map((dist, i) => 
            Math.abs(dist - (prevDistances[i] || 0))
          );
          fingerDistanceChanges += changes.reduce((sum, val) => sum + val, 0) / changes.length;
        }
        
        prevDistances = distances;
      }
    });
    
    // 计算平均距离变化
    const avgDistanceChange = fingerDistanceChanges / (frames.length - 1);
    
    // 归一化距离变化得分 (适当的变化表示手指在活动)
    const motionScore = avgDistanceChange > 0.01 && avgDistanceChange < 0.1 ? 
                        1.0 : (avgDistanceChange < 0.2 ? 0.5 : 0.2);
    
    // 检测手指是否有交叉
    const fingersCrossed = detectFingersCrossing(frames);
    
    // 计算最终匹配度
    return motionScore * 0.6 + fingersCrossed * 0.4;
  } catch (error) {
    console.error("检测指缝相互揉搓动作时出错:", error);
    return 0.2;
  }
}

// 检测拇指旋转揉搓
function detectThumbRotation(frames, targetHand) {
  try {
    // 拇指关键点索引: 1-4
    const thumbPoints = [1, 2, 3, 4];
    
    // 提取拇指轨迹
    const thumbTrajectory = frames.map(frame => {
      if (frame[targetHand] && frame[targetHand][0]) {
        return thumbPoints.map(idx => frame[targetHand][0].keypoints[idx]);
      }
      return null;
    }).filter(Boolean);
    
    if (thumbTrajectory.length < 5) return 0.3;
    
    // 计算拇指尖(4号点)的运动圆度
    const thumbTipTrajectory = thumbTrajectory.map(points => points[3]);
    const circularity = calculateCircularity(thumbTipTrajectory);
    
    // 检测另一只手是否固定(低运动量)
    const otherHand = targetHand === "Right" ? "Left" : "Right";
    const otherHandStability = calculateHandStability(frames, otherHand);
    
    // 计算最终匹配度
    return circularity * 0.7 + otherHandStability * 0.3;
  } catch (error) {
    console.error(`检测${targetHand}手拇指旋转动作时出错:`, error);
    return 0.2;
  }
}

// 检测腕部揉搓动作
function detectWristMotion(frames) {
  try {
    // 提取两只手腕关键点(0号点)
    const wristTrajectories = {
      Left: frames.map(frame => {
        if (frame.Left && frame.Left[0]) 
          return frame.Left[0].keypoints[0];
        return null;
      }).filter(Boolean),
      
      Right: frames.map(frame => {
        if (frame.Right && frame.Right[0]) 
          return frame.Right[0].keypoints[0];
        return null;
      }).filter(Boolean)
    };
    
    if (wristTrajectories.Left.length < 5 || wristTrajectories.Right.length < 5) {
      return 0.3;
    }
    
    // 检测环形运动
    const leftCircularity = calculateCircularity(wristTrajectories.Left);
    const rightCircularity = calculateCircularity(wristTrajectories.Right);
    
    // 检测手腕接近度
    const wristDistance = frames.map(frame => {
      if (frame.Left && frame.Left[0] && frame.Right && frame.Right[0]) {
        const leftWrist = frame.Left[0].keypoints[0];
        const rightWrist = frame.Right[0].keypoints[0];
        return Math.sqrt(
          Math.pow(leftWrist.x - rightWrist.x, 2) +
          Math.pow(leftWrist.y - rightWrist.y, 2) +
          Math.pow(leftWrist.z - rightWrist.z, 2)
        );
      }
      return 1; // 默认较大距离
    }).reduce((sum, dist) => sum + dist, 0) / frames.length;
    
    const distanceScore = wristDistance < 0.2 ? 1.0 : (wristDistance < 0.4 ? 0.5 : 0.1);
    
    // 计算最终匹配度
    return (leftCircularity + rightCircularity) * 0.4 + distanceScore * 0.2;
  } catch (error) {
    console.error("检测腕部揉搓动作时出错:", error);
    return 0.2;
  }
}

// 计算轨迹圆形度
function calculateCircularity(points) {
  if (!points || points.length < 5) return 0;
  
  try {
    // 计算轨迹的中心点
    const center = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };
    
    // 计算到中心的平均距离
    const avgRadius = points.reduce((sum, p) => {
      return sum + Math.sqrt(
        Math.pow(p.x - center.x, 2) + 
        Math.pow(p.y - center.y, 2)
      );
    }, 0) / points.length;
    
    // 计算每个点到中心的距离标准差
    const radiusVariance = points.reduce((sum, p) => {
      const distance = Math.sqrt(
        Math.pow(p.x - center.x, 2) + 
        Math.pow(p.y - center.y, 2)
      );
      return sum + Math.pow(distance - avgRadius, 2);
    }, 0) / points.length;
    
    // 计算圆形度得分 (标准差越小，越接近圆形)
    const circularityScore = Math.exp(-10 * radiusVariance);
    
    return circularityScore;
  } catch (error) {
    console.error("计算轨迹圆形度时出错:", error);
    return 0;
  }
}

// 检测水平摩擦运动
function detectHorizontalMotion(frames, handName) {
  try {
    // 提取手掌中心点轨迹
    const palmTrajectory = frames.map(frame => {
      if (frame[handName] && frame[handName][0]) 
        return frame[handName][0].keypoints[9]; // 手掌中心点
      return null;
    }).filter(Boolean);
    
    if (palmTrajectory.length < 5) return 0.3;
    
    // 计算水平方向位移
    let horizontalDisplacements = [];
    for (let i = 1; i < palmTrajectory.length; i++) {
      horizontalDisplacements.push(
        Math.abs(palmTrajectory[i].x - palmTrajectory[i-1].x)
      );
    }
    
    // 计算垂直方向位移
    let verticalDisplacements = [];
    for (let i = 1; i < palmTrajectory.length; i++) {
      verticalDisplacements.push(
        Math.abs(palmTrajectory[i].y - palmTrajectory[i-1].y)
      );
    }
    
    // 计算水平运动得分 (水平位移应该大于垂直位移)
    const avgHorizontal = horizontalDisplacements.reduce((sum, val) => sum + val, 0) / 
                         horizontalDisplacements.length;
    const avgVertical = verticalDisplacements.reduce((sum, val) => sum + val, 0) / 
                       verticalDisplacements.length;
    
    return avgHorizontal > avgVertical ? 
           Math.min(avgHorizontal / (avgVertical + 0.001), 1) : 0.2;
  } catch (error) {
    console.error("检测水平摩擦运动时出错:", error);
    return 0.2;
  }
}

// 检测手指交叉
function detectFingersCrossing(frames) {
  try {
    // 指尖关键点索引: 8, 12, 16, 20
    const fingerTips = [8, 12, 16, 20];
    
    // 计算交叉状态的帧数
    let crossedFrames = 0;
    let totalFrames = 0;
    
    frames.forEach(frame => {
      if (frame.Left && frame.Left[0] && frame.Right && frame.Right[0]) {
        totalFrames++;
        
        // 检查是否有左手指尖在右手指中间的情况
        let hasCrossing = false;
        
        for (let leftTip of fingerTips) {
          const leftPoint = frame.Left[0].keypoints[leftTip];
          
          // 检查这个左手指尖是否在任意两个右手指尖之间
          for (let i = 0; i < fingerTips.length - 1; i++) {
            for (let j = i + 1; j < fingerTips.length; j++) {
              const rightPoint1 = frame.Right[0].keypoints[fingerTips[i]];
              const rightPoint2 = frame.Right[0].keypoints[fingerTips[j]];
              
              // 简化的交叉检测
              if (isPointBetween(leftPoint, rightPoint1, rightPoint2)) {
                hasCrossing = true;
                break;
              }
            }
            if (hasCrossing) break;
          }
          if (hasCrossing) break;
        }
        
        // 同样检查右手指尖是否在左手指中间
        if (!hasCrossing) {
          for (let rightTip of fingerTips) {
            const rightPoint = frame.Right[0].keypoints[rightTip];
            
            for (let i = 0; i < fingerTips.length - 1; i++) {
              for (let j = i + 1; j < fingerTips.length; j++) {
                const leftPoint1 = frame.Left[0].keypoints[fingerTips[i]];
                const leftPoint2 = frame.Left[0].keypoints[fingerTips[j]];
                
                if (isPointBetween(rightPoint, leftPoint1, leftPoint2)) {
                  hasCrossing = true;
                  break;
                }
              }
              if (hasCrossing) break;
            }
            if (hasCrossing) break;
          }
        }
        
        if (hasCrossing) {
          crossedFrames++;
        }
      }
    });
    
    // 计算交叉帧比例
    return totalFrames > 0 ? crossedFrames / totalFrames : 0;
  } catch (error) {
    console.error("检测手指交叉时出错:", error);
    return 0.2;
  }
}

// 判断一个点是否在两点之间的区域内
function isPointBetween(point, point1, point2) {
  // 简化的检测，基于点的x,y坐标
  const minX = Math.min(point1.x, point2.x);
  const maxX = Math.max(point1.x, point2.x);
  const minY = Math.min(point1.y, point2.y);
  const maxY = Math.max(point1.y, point2.y);
  
  return point.x >= minX && point.x <= maxX && 
         point.y >= minY && point.y <= maxY;
}

// 计算指定关键点之间的平均距离
function calculateAverageDistance(frames, point1Index, point2Index) {
  try {
    let totalDistance = 0;
    let frameCount = 0;
    
    frames.forEach(frame => {
      if (frame.Left && frame.Left[0] && frame.Right && frame.Right[0]) {
        const leftPoint = frame.Left[0].keypoints[point1Index];
        const rightPoint = frame.Right[0].keypoints[point2Index];
        
        if (leftPoint && rightPoint) {
          const distance = Math.sqrt(
            Math.pow(leftPoint.x - rightPoint.x, 2) +
            Math.pow(leftPoint.y - rightPoint.y, 2) +
            Math.pow(leftPoint.z - rightPoint.z, 2)
          );
          
          totalDistance += distance;
          frameCount++;
        }
      }
    });
    
    return frameCount > 0 ? totalDistance / frameCount : 1.0;
  } catch (error) {
    console.error("计算平均距离时出错:", error);
    return 1.0; // 错误时返回较大距离
  }
}

// 计算手部稳定性（静止程度）
function calculateHandStability(frames, handName) {
  try {
    // 提取手掌中心点轨迹
    const palmTrajectory = frames.map(frame => {
      if (frame[handName] && frame[handName][0]) 
        return frame[handName][0].keypoints[9]; // 手掌中心点
      return null;
    }).filter(Boolean);
    
    if (palmTrajectory.length < 3) return 0.5; // 数据不足时返回中等稳定性
    
    // 计算每帧之间的位移
    let displacements = [];
    for (let i = 1; i < palmTrajectory.length; i++) {
      displacements.push(
        Math.sqrt(
          Math.pow(palmTrajectory[i].x - palmTrajectory[i-1].x, 2) +
          Math.pow(palmTrajectory[i].y - palmTrajectory[i-1].y, 2) +
          Math.pow(palmTrajectory[i].z - palmTrajectory[i-1].z, 2)
        )
      );
    }
    
    // 计算平均位移
    const avgDisplacement = displacements.reduce((sum, val) => sum + val, 0) / displacements.length;
    
    // 位移越小，越稳定
    return Math.max(0, 1 - (avgDisplacement * 10));
  } catch (error) {
    console.error(`计算${handName}手稳定性时出错:`, error);
    return 0.5; // 错误时返回中等稳定性
  }
}

// 辅助函数：从滤波数据中获取手部关键点
function getHandLandmarks(filteredData, handType) {
  if (!filteredData || !filteredData[handType] || filteredData[handType].length === 0) {
    return null;
  }
  
  // 获取该手关键点
  return filteredData[handType][0].keypoints;
}
</script>

<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem; /* 减小整体内边距 */
  box-sizing: border-box;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 1400px; /* 增加最大宽度以适应水平布局 */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  justify-content: space-between; /* 改为space-between让元素更紧凑 */
  min-height: 90vh;
  position: relative;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(15, 56, 124, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 顶部区域样式 - 进一步减小间距 */
.header {
  padding: 0.25rem 0; /* 减小内边距 */
  width: 100%;
  margin-bottom: 0.5rem; /* 进一步减小底部间距 */
  position: relative;
  margin-top: 0.25rem;
  
  @media (min-width: 768px) {
    padding: 0.5rem 0 !important;
    margin-bottom: 1rem !important;
  }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  
  @media (min-width: 768px) {
    max-width: 1400px;
    margin: 0 auto;
  }
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  flex: 1;
  order: 2;
}

.logo-image {
  height: 2.25rem;
  width: auto;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 1.75rem;
  }
  
  @media (min-width: 768px) {
    height: 3rem !important;
  }
}

.step-title {
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1.75rem;
  color: #0f387c;
  margin: 0;
  animation: fadeIn 0.5s ease;
  text-align: left;
  flex: 1.5;
  order: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
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
  order: 3;
  
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
  
  @media (min-width: 768px) {
    width: 4rem !important;
    height: 4rem !important;
  }
}

/* 主要内容区域 - 桌面时为水平布局，移动时为垂直布局 */
.main-section {
  display: flex;
  flex-direction: column; /* 默认为垂直布局 */
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 0.75rem; /* 减小主要内容间的间距 */
  justify-content: center;
  
  /* 在桌面屏幕上使用水平布局 - 降低阈值确保更广泛兼容 */
  @media (min-width: 768px) {
    flex-direction: row !important;
    align-items: center !important;
    gap: 1.5rem !important;
  }
}

/* 指导区域 */
.guide-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 0.25rem;
  
  @media (min-width: 768px) {
    width: 48% !important; /* 在桌面端占用接近一半宽度 */
    margin-bottom: 0 !important;
  }
}

/* 右侧区域容器 */
.right-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.75rem;
  
  @media (min-width: 768px) {
    width: 48% !important; /* 在桌面端占用接近一半宽度 */
    padding-top: 2rem !important;
  }
}

.guide-image-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    max-width: 100% !important;
  }
}

.guide-image {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(15, 56, 124, 0.15);
}

.countdown-timer {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 5;
}

.timer-circle {
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(245, 248, 253, 0.9);
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

/* 相机区域 */
.camera-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0; /* 移除顶部边距 */
}

.camera-container {
  width: 90%;
  max-width: 450px;
  position: relative;
  background: transparent;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(15, 56, 124, 0.1);
  aspect-ratio: 16/9;
  margin: 0 auto;
  margin-bottom: 0.5rem;
  z-index: 1;
  
  @media (min-width: 768px) {
    max-width: 100% !important;
    margin-bottom: 1rem !important;
  }
}

.output_canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  //transform: scaleY(-1);
  background: transparent;
  border-radius: 12px;
}

.input_video {
  background: transparent;
  border-radius: 12px;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 控制面板样式 - 完全隐藏 */
.controls-wrapper {
  display: none !important;
}

/* 反馈卡片 */
.feedback-card {
  width: 90%;
  max-width: 450px;
  margin: 0 auto;
  margin-top: 0.5rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 12px rgba(15, 56, 124, 0.1);
  z-index: 1;
  margin-bottom: 0.5rem;
  
  @media (min-width: 768px) {
    max-width: 100% !important;
  }
}

.feedback-title {
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  color: #0f387c;
  margin-bottom: 0.75rem;
  
  @media (max-width: 480px) {
    font-size: 1.125rem;
  }
}

.feedback-rating {
  text-align: center;
  transform: scale(2);
  padding: 0.5rem 0;
  
  @media (max-width: 480px) {
    transform: scale(1.7);
  }
}

/* 转场效果样式 */
.transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 1; /* 确保起始透明度为1 */
  transition: opacity 0.3s ease-out; /* 添加过渡效果 */
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}

.fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.transition-content {
  background-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  max-width: 90%;
}

.transition-next {
  font-size: 1.5rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 1rem;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
}

.transition-result {
  font-size: 2.25rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  margin-bottom: 1.5rem;
  animation: fadeScale 1.2s ease infinite alternate;
  
  @media (max-width: 480px) {
    font-size: 1.75rem;
  }
}

.transition-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 1rem 0;
  
  @media (max-width: 480px) {
    width: 2.5rem;
    height: 2.5rem;
    border-width: 2px;
  }
}

/* 修复加载指示器样式，移除灰色遮罩 */
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

/* 进一步优化桌面布局 */
@media (min-width: 768px) {
  .content-wrapper {
    flex-direction: column !important;
    justify-content: flex-start !important;
    padding: 1rem !important;
  }
  
  .main-section {
    flex: 1 !important;
    margin-top: 1rem !important;
  }
  
  .guide-image-container {
    max-width: 100% !important;
  }
  
  .camera-container {
    max-width: 100% !important;
    margin-bottom: 1rem !important;
  }
  
  .feedback-card {
    max-width: 100% !important;
  }
}

/* 响应式布局优化 */
@media (min-height: 900px) {
  .main-section {
    gap: 1rem; /* 减小高屏幕上的组件间距 */
  }
  
  .content-wrapper {
    justify-content: space-around;
  }
  
  .header {
    margin-top: 0.75rem; /* 减小高屏幕上的顶部间距 */
    margin-bottom: 1rem; /* 减小高屏幕上的底部间距 */
  }
}

@media (min-height: 700px) and (max-height: 899px) {
  .main-section {
    gap: 0.75rem; /* 减小间距 */
  }
  
  .header {
    margin-top: 0.5rem;
    margin-bottom: 0.75rem;
  }
}

@media (max-height: 699px) {
  .main-section {
    gap: 0.75rem; /* 进一步减少小屏幕上组件间距 */
  }
  
  .header {
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
  }
  
  .guide-image-container,
  .camera-container,
  .feedback-card {
    max-width: 400px;
  }
  
  .logo-image {
    height: 1.75rem;
  }
}

@media (max-height: 600px) {
  .main-section {
    gap: 0.5rem; /* 更小的屏幕进一步减少间距 */
  }
  
  .header {
    margin-bottom: 0.5rem;
  }
  
  .guide-image-container,
  .camera-container,
  .feedback-card {
    max-width: 350px;
  }
  
  .step-title {
    font-size: 1.25rem;
  }
  
  .feedback-rating {
    transform: scale(1.5);
  }
}

@keyframes fadeScale {
  from { transform: scale(1); opacity: 0.9; }
  to { transform: scale(1.05); opacity: 1; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 桌面端特定样式优化 */
@media (min-width: 1200px) {
  .content-wrapper {
    max-width: 1600px; /* 在超大屏幕上进一步增加宽度 */
  }
  
  .main-section {
    gap: 2rem !important; /* 增加左右两侧的间距 */
  }
  
  .guide-image {
    border-radius: 16px; /* 在大屏幕上增加圆角 */
  }
  
  .camera-container {
    border-radius: 16px; /* 在大屏幕上增加圆角 */
  }
  
  .feedback-card {
    padding: 1rem 1.5rem; /* 在大屏幕上增加内边距 */
  }
  
  .feedback-title {
    font-size: 1.5rem; /* 在大屏幕上增加字体大小 */
  }
}

/* 调整图片容器在水平布局中的高度比例 */
@media (min-width: 768px) {
  .guide-image {
    max-height: 70vh;
    width: auto;
    margin: 0 auto;
    display: block;
  }
  
  .camera-container {
    margin-bottom: 1rem !important;
    height: auto;
    min-height: 350px;
  }
  
  /* 调整评分卡片在水平布局中的样式 */
  .feedback-card {
    margin-top: 0;
  }
  
  /* 增强标题在水平布局中的可见性 */
  .step-title {
    font-size: 2rem;
  }
}

/* 针对超宽显示器的优化 */
@media (min-width: 1600px) {
  .guide-section, .right-section {
    width: 45% !important;
  }
  
  .main-section {
    justify-content: center !important;
    gap: 4rem !important;
  }
}

/* 卡尔曼滤波切换开关样式 */
.filter-toggle {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 5px 10px;
  border-radius: 20px;
  z-index: 10;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  margin-right: 8px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #2196F3;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-label {
  color: white;
  font-size: 12px;
  font-weight: bold;
}
</style> 
