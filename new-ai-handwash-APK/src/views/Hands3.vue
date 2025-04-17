<template>
  <div class="home">
    <div class="home-top">
      <div class="flex-item">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="home-title">
          <div style="margin-left: 76px">{{ $t("HandHygiene.step3") }}</div>
          <div class="back-home">
            <img src="../assets/blueHome.png" alt="" @click="backHome" />
          </div>
        </div>
        <div class="home-flex">
          <div class="home-img">
            <img id="hands" src="../assets/3.gif" alt="" />
          </div>
          <div class="flex-item percentage progress">
            <div class="circle">
              <div>{{ countdownDisplay }}s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <a
        ref="downloadLink"
        :href="videoUrl"
        :download="downloadName + '-step3' + '.mp4'"
        style="display: none"
        >下载录制的视频</a
      >
    </div>
    <div style="margin: 26px 67px 0px 67px">
      <div class="home-camera">
        <div class="container">
          <video class="input_video"></video>
          <canvas class="output_canvas" width="1280px" height="720px"></canvas>
          <div class="loading" v-loading="loading"></div>
        </div>
        <div class="control-panel"></div>
      </div>
      <div class="feedback">
        <div class="feedback-content">
        {{ $t(`HandHygiene.performance`) }}
        </div>
        <!-- 原来的图片反馈替换为只读评分 -->
        <div class="feedback-area">
          <!--<el-rate
            v-model="resultValue"
            disabled
            show-score
            text-color="var(--el-color-primary-dark-2)"
            score-template="{value} points"
          />-->
          <el-rate
            v-model="resultValue"
            disabled
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as controls from "@mediapipe/control_utils";
import * as mpHands from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import DeviceDetector from "device-detector-js";
import { createConnect, disconnect, sendLog } from "../services/socket";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { getTime } from "../utils/formatData";
// 评分组件
import { ElRate } from 'element-plus';
const resultValue = ref(0);
const store = useStore();
const router = useRouter();
// 倒计时逻辑
const percentage = ref(100);
const countdown = ref(3);
const countdownDisplay = ref(countdown.value);
const countdownStarted = ref(false);
const text = ref("");
const leftHand = ref(false);
const rightHand = ref(true);
let timer = null; // 声明计时器变量
const inputVideo = ref(null);
const mediaRecorder = ref(null);
const recordedChunks = ref([]);
const videoUrl = ref("");
const downloadLink = ref(null);
const stream = ref();
const setupMedia = async () => {
  try {
    console.log("📹 访问摄像头...");
    const mediaRecorderOptions = { mimeType: "video/webm" };
    mediaRecorder.value = new MediaRecorder(stream.value, mediaRecorderOptions);
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
  } catch (error) {
    console.log("Error accessing media devices", error);
  }
};
async function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
const startRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state === "inactive") {
    recordedChunks.value = [];
    mediaRecorder.value.start();
  }
};

const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state === "recording") {
    mediaRecorder.value.stop();
  }
};
const startCountdown = () => {
  startRecording();
  countdown.value = 3; // 重置倒计时为3秒
  countdownDisplay.value = countdown.value; // 更新显示的倒计时值
  timer = setInterval(() => {
    countdown.value--;
    let str = Math.ceil((countdown.value / 3) * 100); // 根据3秒计算百分比
    percentage.value = str;
    countdownDisplay.value = countdown.value >= 0 ? countdown.value : "";
    if (countdown.value === 0) {
      clearInterval(timer);
      countdownDisplay.value = 0; // 设置为空字符串
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
    return false;  // 未检测到手，直接判定为 False
  }

  if (landmarksList.length < 2) {
    console.log("⚠️ 仅检测到一只手，不参与重叠计算");
    return true;  // 仅检测到一只手，不参与重叠计算
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


  // **判断两个手的边界框是否有重叠**
  const overlapX = Math.max(0, Math.min(hand1Box.maxX, hand2Box.maxX) - Math.max(hand1Box.minX, hand2Box.minX));
  const overlapY = Math.max(0, Math.min(hand1Box.maxY, hand2Box.maxY) - Math.max(hand1Box.minY, hand2Box.minY));

  const Overlapping = overlapX > 0 && overlapY > 0;

  console.log("🖐 双手是否重叠:", Overlapping);

  return Overlapping;
}

const accountID = computed(() => {
  return store.state.user.accountID;
});
const redirectTimeoutId = ref(true);
async function stopCountdown() {
  try {
    clearInterval(timer);
    countdownDisplay.value = 0; // 设置为空字符串
    console.log("resList:", resList);
    // 记录 resList 数据
    sendLog("info", `resList: ${JSON.stringify(resList)}`);
    // 计算 true 和 false 总数
    const totalCount = resList.length;  // 总接收数据条数
    const trueCount = resList.filter(ans => ans === true).length;  // 统计 true 的数量
    const trueRatio = totalCount > 0 ? (trueCount / totalCount) * 100 : 0; // 计算 true 占比 (%)
    console.log(`统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);
    // 记录统计数据
    sendLog("info", `统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);
    // 根据新的规则判断评分
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
    // 记录评分结果
    sendLog("info", `评分结果: ${text.value}, 分数: ${resultValue.value}`);

    await store.dispatch("user/rating", {
      id:
        sessionStorage.getItem("accountSerialNumber") ||
        localStorage.getItem("accountSerialNumber"),
      rating: text.value,
      points: parseFloat((trueRatio / 7).toFixed(3)),
      step_video_file: `${downloadName.value}-step3`,
    });
    if (redirectTimeoutId.value) {
      setTimeout(() => {
        stopRecording();
        router.push({
          path: "/hands4",
        });
      }, 2500);
    }
  } catch (e) {
    console.log(e);
  }
}
const resList = []; // 用于存储每次的 res 值
const loading = ref(true);
const downloadName = ref();
onMounted(() => {
  downloadName.value = getTime(
    sessionStorage.getItem("accountSerialNumber") ||
      localStorage.getItem("accountSerialNumber")
  );
  // Our input frames will come from here.
  const videoElement = document.getElementsByClassName("input_video")[0];
  const canvasElement = document.getElementsByClassName("output_canvas")[0];
  const controlsElement = document.getElementsByClassName("control-panel")[0];
  const canvasCtx = canvasElement.getContext("2d");
  const config = {
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    },
  };
  stream.value = canvasElement.captureStream();
  setupMedia();
  // We'll add this to our control panel later, but we'll save it here so we can
  // call tick() each time the graph runs.
  const fpsControl = new controls.FPS();
  // Optimization: Turn off animated spinner after its hiding animation is done.
  async function onResults(results) {
    loading.value = false;
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

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
        countdownStarted.value = true;
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
        // 检查是否没有手或双手摊开
        const leftHand = combinedData["Left"] && combinedData["Left"].length > 0 ? combinedData["Left"][0].keypoints : null;
        const rightHand = combinedData["Right"] && combinedData["Right"].length > 0 ? combinedData["Right"][0].keypoints : null;

        const landmarksList = [];
        if (leftHand) landmarksList.push(leftHand);
        if (rightHand) landmarksList.push(rightHand);
        console.log("landmarksList",landmarksList);

        const overlap = await isOverlapping(landmarksList);
        if (!overlap) {
          console.log("⚠️ 未检测到手或双手摊开，直接判定 FALSE");
          resList.push(false); // 强制记录 false
        } else {
        console.log("✅ 正常洗手，执行后续检测");
        storeDataEverySecond(combinedData); // 如果手势正常，则存储数据
        }
      }
    }
    if (results.multiHandLandmarks.length === 0) {
      startNumber = 0;
      endNumber = 25;
      disconnect();
    }
    canvasCtx.restore();
    if (results.multiHandWorldLandmarks) {
      // We only get to call updateLandmarks once, so we need to cook the data to
      // fit. The landmarks just merge, but the connections need to be offset.
      const landmarks = results.multiHandWorldLandmarks.reduce(
        (prev, current) => [...prev, ...current],
        []
      );
      const colors = [];
      let connections = [];
      for (
        let loop = 0;
        loop < results.multiHandWorldLandmarks.length;
        ++loop
      ) {
        const offset = loop * mpHands.HAND_CONNECTIONS.length;
        const offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [
          connection[0] + offset,
          connection[1] + offset,
        ]);
        connections = connections.concat(offsetConnections);
        const classification = results.multiHandedness[loop];
        colors.push({
          list: offsetConnections.map((unused, i) => i + offset),
          color: classification.label,
        });
      }
    }
  }
  let storedData = [];
  let newData = [];
  let startNumber = 0;
  let endNumber = 25;
  let firstType = true;
  let currentStep = 3; // 当前步骤编号
  async function storeDataEverySecond(results) {
    storedData.push(results);
    if (firstType) {
      if (storedData.length > 25) {
       newData = storedData.slice(startNumber, endNumber);
       try {
          const res = await createConnect(newData, currentStep);  // 等待服务器返回数据
          console.log("服务器返回:", res);
          if (res && res.ans !== undefined) {  // 确保数据格式正确，并包含 ans
            // 根据返回的 'True' 或 'False' 转换为布尔值
            resList.push(res.ans === 'True'); 
          }
       } catch (error) {
         console.error('Error during socket communication:', error);
       }
       firstType = false;
       newData = [];
       storedData.shift();
     }
   } else {
      storedData.shift();
      newData = storedData.slice(startNumber, endNumber);
      try {
        const res = await createConnect(newData, currentStep);
        console.log("服务器返回:", res);
        if (res && res.ans !== undefined) {
          // 根据返回的 'True' 或 'False' 转换为布尔值
          resList.push(res.ans === 'True');
        }
      } catch (error) {
        console.error('Error during socket communication:', error);
      }
      newData = [];
    }
  }
  const hands = new mpHands.Hands(config);
  hands.onResults(onResults);
  
  // 保存hands实例到window对象，以便在组件卸载时释放
  window.handsInstance = hands;
  
  // 保存视频元素引用，以便在组件卸载时停止视频流
  window.videoElement = videoElement;
  
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
      videoElement.classList.toggle("selfie", options.selfieMode);
      hands.setOptions(options);
    });
});
watch(countdownStarted, (newVal) => {
  if (newVal) {
    startCountdown();
  }
});
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
onUnmounted(() => {
  // 组件卸载前的清理操作
  console.log("正在清理Hands3.vue组件资源...");
  
  // 1. 清理MediaPipe hands实例
  if (window.handsInstance) {
    try {
      // 关闭MediaPipe实例
      window.handsInstance.close();
      console.log("MediaPipe Hands实例已关闭");
    } catch (error) {
      console.error("关闭MediaPipe Hands实例时出错:", error);
    }
    window.handsInstance = null;
  }

  // 2. 停止视频流
  if (window.videoElement && window.videoElement.srcObject) {
    try {
      // 获取所有轨道
      const tracks = window.videoElement.srcObject.getTracks();
      
      // 停止每个轨道
      tracks.forEach(track => {
        track.stop();
      });
      
      // 清除视频源
      window.videoElement.srcObject = null;
      console.log("视频流已停止并清理");
    } catch (error) {
      console.error("停止视频流时出错:", error);
    }
  }
  
  // 3. 停止MediaRecorder录制
  if (mediaRecorder.value && mediaRecorder.value.state === "recording") {
    try {
      mediaRecorder.value.stop();
      console.log("MediaRecorder已停止");
    } catch (error) {
      console.error("停止MediaRecorder时出错:", error);
    }
  }
  
  // 4. 清理stream资源
  if (stream.value) {
    try {
      const tracks = stream.value.getTracks();
      tracks.forEach(track => {
        track.stop();
      });
      console.log("Stream流已停止");
    } catch (error) {
      console.error("清理Stream时出错:", error);
    }
    stream.value = null;
  }
  
  // 5. 断开socket连接
  try {
    disconnect();
    console.log("Socket连接已断开");
  } catch (error) {
    console.error("断开Socket连接时出错:", error);
  }
  
  // 6. 清除计时器
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("计时器已清理");
  }
  
  // 7. 释放Blob URL资源
  if (videoUrl.value) {
    try {
      URL.revokeObjectURL(videoUrl.value);
      console.log("Blob URL已释放");
    } catch (error) {
      console.error("释放Blob URL时出错:", error);
    }
    videoUrl.value = "";
  }
  
  // 8. 清空数据数组
  recordedChunks.value = [];
  resList.length = 0;
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.container {
  width: 500px;
  height: 300px;
  margin: 0 auto;
  position: relative;
  background: transparent;
}
.home {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background-image: url("../assets/bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  &-top {
    display: flex;
    .flex-item {
      flex: 1;
    }
  }
  &-title {
    height: 140px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 39px;
    @media (max-width: 768px) {
      font-size: 32px;
      height: 120px;
    }
    color: #0f387c;
    font-style: normal;
    text-transform: none;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: -30px;
  }
  .logo-image {
    width: auto;
    height: 30px;  
  }
  .back-home {
    width: 75px;
    height: 75px;
    margin-right: 83px;
    @media (max-width: 768px) {
      width: 60px;
      height: 60px;
      margin-right: 60px;
    }
    img {
      width: 100%;
      height: 100%;
    }
  }
  .home-flex {
    margin-left: 67px;
    margin-right: 67px;
    margin-top: -23px;
    background: transparent;
    .home-img {
      display: flex;
      justify-content: center;
    }
  }
  #hands {
    border-radius: 0;
    overflow: hidden;
    width: 604px;
    height: 604px;
    @media (max-width: 1024px) {
      width: 550px;
      height: 550px;
    }
    @media (max-width: 768px) {
      width: 504px;
      height: 504px;
    }
  }
  &-camera {
    margin-top: 15px;
    height: auto;
    background-color: transparent;
  }
}
.feedback {
  //background-color:#fff;
  margin: 2px 25px 0px 25px;
  &-content {
    font-size: 24px;
    font-weight: 500; 
    text-align: center; 
    //margin-bottom: 5px;
    //margin-top: 10px;
    color: var(--el-color-primary-dark-2); 
    line-height: 1.4;
  }
  &-area {
    text-align: center; 
    margin: 0 auto; 
    transform: scale(2);
  }
}
.percentage {
  position: absolute;
  top: 150px;
  right: 20px;
  margin-right: 70px;
  @media (max-width: 768px) {
    top: 120px;
    margin-right: 50px;
  }
}
.progress {
  .circle {
    width: 100px;
    height: 100px;
    @media (max-width: 768px) {
      width: 80px;
      height: 80px;
      font-size: 45px;
      line-height: 80px;
    }
    background: #f5f8fd;
    border: 1px solid #7791bc;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 55px;
    color: #4a5c79;
    line-height: 100px;
    text-align: center;
    font-style: normal;
    text-transform: none;
    border-radius: 50%;
  }
  .progress-text {
    font-size: 38px;
    color: rgb(16, 16, 16);
  }
}
.output_canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleY(-1);
  background: transparent;
}
.input_video {
  background: transparent;
}
</style>
