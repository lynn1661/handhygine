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

      <!-- 主要内容区域 - 垂直布局 -->
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

        <!-- 相机预览区域 -->
        <div class="camera-section">
          <div class="camera-container">
            <video class="input_video"></video>
            <canvas class="output_canvas" width="1280px" height="720px"></canvas>
            <div class="loading" v-if="loading"></div>
          </div>
          
          <!-- 将控制面板设为隐藏，但保留功能 -->
          <div class="controls-wrapper" style="display: none;">
            <div class="control-panel"></div>
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
    
    <!-- 转场动画 - 修改为不显示下一步步骤名称 -->
    <transition name="fade">
      <div class="transition-overlay" v-show="showTransition">
        <div class="transition-content">
          <!-- 仅在不是最后一步时显示"下一步"文本 -->
          <div class="transition-next" v-if="currentStep < 7">{{ t('HandHygiene.nextStep') || 'Next Step' }}</div>
          <!-- 只在不是最后一步时显示下一步骤名称 -->
          <div class="transition-result" v-if="currentStep < 7">{{ t(`HandHygiene.step${currentStep + 1}`) }}</div>
          <!-- 在最后一步显示完成文本 -->
          <div class="transition-result" v-if="currentStep >= 7">{{ t('HandHygiene.completion') || 'Completion' }}</div>
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
  console.log("初始化MediaPipe...");
  
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
  
      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
          const combinedData = {};
          const classification = results.multiHandedness[index];
          const isRightHand = classification.label === "Right";
          const landmarks = results.multiHandLandmarks[index];
          
          results.multiHandedness.forEach((item) => {
            const label = item.label;
            combinedData[label] = [];
          });
  
          results.multiHandLandmarks.forEach((item, index) => {
            const label = results.multiHandedness[index].label;
            const keypoints = item.map((point) => ({
              x: point.x,
              y: point.y,
              z: point.z,
            }));
            const score = results.multiHandedness[index].score;
            const handedness = label;
  
            if (!combinedData[label]) {
              combinedData[label] = [];
            }
  
            const newData = {
              keypoints,
              score,
              handedness,
            };
            combinedData[label].push(newData);
          });
          
          // 如果检测到手且未开始评估，自动开始倒计时
          if (!isEvaluating.value && !isFinished.value) {
            console.log("检测到手部，自动开始倒计时");
            countdownStarted.value = true;
          }
          
          // 绘制手部轮廓
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
          
          // 如果正在评估中，则继续检测手势
          if (isEvaluating.value && !isFinished.value) {
            // 检查手部状态
            const leftHand = combinedData["Left"] && combinedData["Left"].length > 0 
              ? combinedData["Left"][0].keypoints 
              : null;
            const rightHand = combinedData["Right"] && combinedData["Right"].length > 0 
              ? combinedData["Right"][0].keypoints 
              : null;
  
            const landmarksList = [];
            if (leftHand) landmarksList.push(leftHand);
            if (rightHand) landmarksList.push(rightHand);
  
            try {
              const overlap = await isOverlapping(landmarksList);
              if (!overlap) {
                console.log("⚠️ 未检测到手或双手摊开，直接判定 FALSE");
                resList.push(false);
              } else {
                console.log("✅ 正常洗手，执行后续检测");
                storeDataEverySecond(combinedData);
              }
            } catch (error) {
              console.error("手部检测过程中出错:", error);
              resList.push(false);
            }
          }
        }
      } else if (results.multiHandLandmarks && results.multiHandLandmarks.length === 0) {
        // 处理没有检测到手的情况
        if (isEvaluating.value && !isFinished.value) {
          console.log("未检测到手");
          if (startNumber !== undefined && endNumber !== undefined) {
            startNumber = 0;
            endNumber = 25;
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
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  justify-content: space-between; /* 改为space-between让元素更紧凑 */
  min-height: 90vh;
  position: relative;
  padding: 0.5rem;
}

/* 顶部区域样式 - 进一步减小间距 */
.header {
  padding: 0.25rem 0; /* 减小内边距 */
  width: 100%;
  margin-bottom: 0.5rem; /* 进一步减小底部间距 */
  position: relative;
  margin-top: 0.25rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
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
}

/* 主要内容区域 - 减小垂直间距 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 0.75rem; /* 进一步减小主要内容间的间距 */
  justify-content: center;
}

/* 指导区域 */
.guide-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 0.25rem; /* 进一步减少底部间距 */
}

.guide-image-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
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
</style> 