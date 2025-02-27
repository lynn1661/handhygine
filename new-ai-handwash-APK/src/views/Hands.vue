<template>
  <div class="home">
    <div class="home-top">
      <div class="flex-item">
        <div class="home-title">
          <div style="margin-left: 76px">{{ $t("HandHygiene.step1") }}</div>
          <div class="back-home">
            <img src="../assets/blueHome.png" alt="" @click="backHome" />
          </div>
        </div>
        <div class="home-flex">
          <div class="home-img">
            <img id="hands" src="../assets/1.gif" alt="" />
          </div>
          <div class="handDiv-r">
            <div v-if="leftHand" class="hand-right">{{ $t("HandHygiene.rightHand") }}</div>
          </div>
          <div class="handDiv-l">
            <div v-if="rightHand" class="hand-left">{{ $t("HandHygiene.leftHand") }}</div>
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
        :download="downloadName + '-step1' + '.mp4'"
        style="display: none"
        >下载录制的视频</a
      >
    </div>
    <div style="margin: 26px 67px 0px 67px">
      <div class="home-camera">
        <div class="container">
          <video ref="inputVideo" class="input_video"></video>
          <canvas class="output_canvas" width="1280px" height="720px"></canvas>
          <div class="performance">
            <div v-if="text == 'PERFECT'">
              <img src="../assets/PERFECT.png" class="perfectImg" />
            </div>
            <div v-if="text == 'GOOD'">
              <img src="../assets/GOOD.png" class="goodImg" />
            </div>
            <div v-if="text == 'FAIL'">
              <img src="../assets/FAIL.png" class="goodImg" />
            </div>
          </div>
          <div class="loading" v-loading="loading"></div>
        </div>
        <div class="control-panel"></div>
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
const store = useStore();
const router = useRouter();
// 倒计时逻辑
const percentage = ref(100);
const countdown = ref(2);
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
    });
  } catch (error) {
    console.log("访问摄像头失败:", error);
    
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
  countdown.value = 2; // 重置倒计时
  countdownDisplay.value = countdown.value; // 更新显示的倒计时值

  timer = setInterval(() => {
    countdown.value--;
    let str = Math.ceil((countdown.value / 2) * 100); // 取整数，根据每个阶段的一半计算百分比
    percentage.value = str;
    countdownDisplay.value = countdown.value >= 0 ? countdown.value : "";
    if (countdown.value < 0) {
      clearInterval(timer);
      countdownDisplay.value = 0; // 设置为空字符串
      setTimeout(() => {
        rightHand.value = false;
        leftHand.value = true;
        countdown.value = 2; // 重置倒计时为2秒
        countdownDisplay.value = countdown.value; // 更新显示的倒计时值
        timer = setInterval(() => {
          countdown.value--;
          let str = Math.ceil((countdown.value / 2) * 100); // 取整数，根据每个阶段的一半计算百分比
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
      }, 1000);
    }
  }, 1000);
};

/*222
async function isHandOpen(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    console.log("⚠️ hand 数据无效或未识别到手", JSON.stringify(landmarks, null, 2));
    return true;
  }

  console.log("🎯 开始检测手势，手部关键点数据:", landmarks);

  const wrist = landmarks[0];
  const middleMCP = landmarks[9]; // 中指 MCP 关节点

  // **🟢 计算手掌法向量 (Palm Normal Vector)**
  const palmVector = {
    x: middleMCP.x - wrist.x,
    y: middleMCP.y - wrist.y,
    z: middleMCP.z - wrist.z
  };

  console.log(`📏 计算手掌法向量:`, palmVector);

  // **🟢 计算手掌朝向**
  const palmFacingCamera = palmVector.z > 0.03;  // 手掌朝向摄像头
  const backFacingCamera = palmVector.z < -0.03; // 手背朝向摄像头
  console.log("📏 手掌朝向摄像头:", palmFacingCamera);
  console.log("📏 手背朝向摄像头:", backFacingCamera);

  // **🟢 计算手指张开角度**
  function getAngle(fingerTip, fingerMCP) {
    const dx1 = fingerTip.x - fingerMCP.x;
    const dy1 = fingerTip.y - fingerMCP.y;
    const dx2 = wrist.x - fingerMCP.x;
    const dy2 = wrist.y - fingerMCP.y;

    const dotProduct = dx1 * dx2 + dy1 * dy2;
    const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    return Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
  }

  const fingerAngles = [
    getAngle(landmarks[4], landmarks[2]),   // 拇指
    getAngle(landmarks[8], landmarks[5]),   // 食指
    getAngle(landmarks[12], landmarks[9]),  // 中指
    getAngle(landmarks[16], landmarks[13]), // 无名指
    getAngle(landmarks[20], landmarks[17])  // 小指
  ];

  console.log("📊 各手指角度:", fingerAngles.map(a => a.toFixed(2)).join(", "));

  // **🟢 手指张开优化**
  const fingersExtended = fingerAngles.filter(angle => angle > 50).length >= 3;
  console.log("🖐 手指完全张开 (优化后):", fingersExtended);

  // **🟢 检测手指间距**
  function getDistance(p1, p2) {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );
  }

  const fingerDistances = [
    getDistance(landmarks[8], landmarks[12]),  // 食指 - 中指
    getDistance(landmarks[12], landmarks[16]), // 中指 - 无名指
    getDistance(landmarks[16], landmarks[20])  // 无名指 - 小指
  ];

  const fingersApart = fingerDistances.every(dist => dist > 0.05);
  console.log("✋ 手指间距是否足够分开:", fingersApart);

  // **🟢 允许“手指并拢但平放”也算张开**
  const fingersCloseAndFlat = fingerDistances.every(dist => dist < 0.02);
  console.log("✋ 手指并拢且平放:", fingersCloseAndFlat);

  // **🟢 最终判断是否摊开**
  let isOpen = fingersExtended || palmFacingCamera || backFacingCamera || fingersApart || fingersCloseAndFlat;
  console.log(`✅ 手是否摊开 (优化后): ${isOpen ? "是" : "否"}`);

  return isOpen;
}
*/
/*111
// 检测 **是否有手摊开** 或者 **未检测到手**
async function isAnyHandOpen(results) {
  if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    console.log("🚨 没有检测到手，直接判定为 False");
    return true; // **直接判定摊开**
  }

  // console.log("📸 Mediapipe 识别到的手部数据:", JSON.stringify(results.multiHandLandmarks, null, 2));
  console.log("🎯 开始检测是否有手摊开");

  for (const landmarks of results.multiHandLandmarks) {
    const handOpen = await isHandOpen(landmarks);
    if (handOpen) {
      console.log(`⚠️ 发现手摊开，立即判定为 False`);
      return true; // 只要有一只手摊开，就返回 true
    }
  }

  console.log("✅ 未发现手摊开，正常进行检测");
  return false;
}*/

/* 3333
let isForcedFail = false;  // 存储是否因手持续摊开导致 FAIL
let handOpenStartTime = null; // 记录手摊开的开始时间

async function trackHandOpen(results) {
  console.log("📡 开始追踪手势状态...");

  const isOpen = await isHandOpen(results.multiHandLandmarks);

  if (isOpen) {
    if (!handOpenStartTime) {
      handOpenStartTime = Date.now(); // 记录开始时间
    }
  } else {
    handOpenStartTime = null; // 手恢复正常，重置时间
  }

  if (handOpenStartTime && Date.now() - handOpenStartTime >= 2000) { // **时间超过 2 秒**
    console.log("🚨 持续检测到手摊开 2 秒，判定 FAIL");
    isForcedFail = true;
  }
}*/
/* 2222
let openStartTime = null; // 记录摊开手的开始时间
const OPEN_FAIL_THRESHOLD_1 = 1000; // 1秒阈值（单位：毫秒）
const OPEN_FAIL_THRESHOLD_2 = 2000; // 2秒阈值（单位：毫秒）

async function trackHandOpen(results) {
  if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    console.log("🚨 没有检测到手");
    
    if (!openStartTime) {
      openStartTime = Date.now();
    } else if (Date.now() - openStartTime > OPEN_FAIL_THRESHOLD_2) {
      console.log("❌ 持续未检测到手 2 秒，判定 FAIL");
      isForcedFail = true; // 直接判定 FAIL
    }
    return;
  }

  for (const landmarks of results.multiHandLandmarks) {
    const handOpen = await isHandOpen(landmarks);
    if (handOpen) {
      console.log("⚠️ 发现手持续摊开...");
      
      if (!openStartTime) {
        openStartTime = Date.now();
      } else if (Date.now() - openStartTime > OPEN_FAIL_THRESHOLD_1) {
        console.log("❌ 持续检测到手摊开 1 秒，判定 FAIL");
        isForcedFail = true; // 直接判定 FAIL
      }
      return;
    }
  }

  // **如果手恢复正常，重置计时器**
  openStartTime = null;
  return false;
}*/

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

  // console.log("📏 计算出的手部边界框:", hand1Box, hand2Box);

  // **判断两个手的边界框是否有重叠**
  const overlapX = Math.max(0, Math.min(hand1Box.maxX, hand2Box.maxX) - Math.max(hand1Box.minX, hand2Box.minX));
  const overlapY = Math.max(0, Math.min(hand1Box.maxY, hand2Box.maxY) - Math.max(hand1Box.minY, hand2Box.minY));

  const Overlapping = overlapX > 0 && overlapY > 0;

  console.log("🖐 双手是否重叠:", Overlapping);

  return Overlapping;
}

const studnetId = computed(() => {
  return store.state.user.userID;
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
    /* 2323
    // ✅ **如果是因为手持续摊开导致的 FAIL，直接判定**
    if (isForcedFail) {
      console.log("🚨 由于手持续摊开或未检测到手，直接判定 FAIL");
      text.value = "FAIL";
    } else {
      // 计算 true 和 false 总数
      const totalCount = resList.length;
      const trueCount = resList.filter(ans => ans === true).length;
      const trueRatio = totalCount > 0 ? (trueCount / totalCount) * 100 : 0;
      console.log(`统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);
      sendLog("info", `统计总数=${totalCount}, True=${trueCount}, True占比=${trueRatio.toFixed(2)}%`);

      // ✅ **正常评分逻辑**
      if (trueRatio >= 80) {
        text.value = "PERFECT";
      } else if (trueRatio >= 55) {
        text.value = "GOOD";
      } else {
        text.value = "FAIL";
      }
    }*/
    
    // 根据新的规则判断评分
    if (trueRatio >= 80) {
      text.value = "PERFECT";
    } else if (trueRatio >= 55) {
      text.value = "GOOD";
    } else {
      text.value = "FAIL";
    }
    console.log(`评分结果: ${text.value}`);
    // 记录评分结果
    sendLog("info", `评分结果: ${text.value}`);

    await store.dispatch("user/rating", {
      id:
        sessionStorage.getItem("studnetID") ||
        localStorage.getItem("studnetID"),
      rating: text.value,
      is_last: false,
      step_video_file: `${downloadName.value}-step1`,
    });
    if (redirectTimeoutId.value) {
      setTimeout(() => {
        router.push({
          path: "/hands2",
        });
        stopRecording();
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
    sessionStorage.getItem("studnetSerialNumber") ||
      localStorage.getItem("studnetSerialNumber")
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

        // console.log("combinedData",combinedData);
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

        /* 3333
        // **调用 trackHandOpen() 检测是否手持续摊开 2 秒**
        await trackHandOpen(results);

        // ✅ 如果持续 2 秒手摊开，标记为 FAIL
        if (isForcedFail) {
          console.log("🚨 持续检测到手摊开 2 秒，立即判定 FAIL");
          isForcedFail = false; // 复位标记，避免多次触发
          resList.push(false); // 直接标记为 FAIL，不再发送数据
          return;
        }
        */
        /*222
        // ✅ **实时追踪手摊开情况**
        trackHandOpen(results);

        storeDataEverySecond(combinedData);
        */
       
        /* 1111
        // 优先检查双手摊开情况
        if (await isAnyHandOpen(results)) {
          console.log("⚠️ 检测到手摊开或没检测到手，自动判定为 False");
          resList.push(false); // 强制记录 False
        } else {
          console.log("✅ 正常洗手，执行后续检测");
          storeDataEverySecond(combinedData);
        }
        */
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
  let currentStep = 1; // 当前步骤编号  

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
         console.error('WebSocket 发送错误:', error);
       }
       firstType = false;
       newData = [];
       storedData.shift();
     }
   } else {
     storedData.shift();
     newData = storedData.slice(startNumber, endNumber);
     try {
        const res = await createConnect(newData, currentStep);  // 等待服务器返回数据
        console.log("服务器返回:", res);
        if (res && res.ans !== undefined) {  // 确保数据格式正确，并包含 ans
          // 根据返回的 'True' 或 'False' 转换为布尔值
          resList.push(res.ans === 'True'); 
        }
       } catch (error) {
         console.error('WebSocket 发送错误:', error);
       }
     newData = [];
    }
  }


  const hands = new mpHands.Hands(config);
  hands.onResults(onResults);
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
  localStorage.removeItem("studnetID");
  sessionStorage.removeItem("studnetID");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};
onUnmounted(() => {
  // 组件卸载前的清理操作
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.container {
  width: calc(100% - 130px);
}
.home {
  width: 100%;
  height: 100%;
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
    color: #0f387c;
    font-style: normal;
    text-transform: none;
  }
  .back-home {
    width: 75px;
    height: 75px;
    margin-right: 83px;
    img {
      width: 100%;
      height: 100%;
    }
  }
  .home-flex {
    margin-left: 67px;
    margin-right: 67px;
    background: #fff;
    .home-img {
      display: flex;
      justify-content: center;
    }
    .handDiv-l {
      position: absolute;
      top: 0;
      margin-top: -55px;
      .hand-left {
        z-index: 999;
        position: absolute;
        top: 450px;
        left: 10px;
        width: 160px;
        height: 85px;
        border-radius: 13px 13px 13px 13px;
        border: 1px solid #7791bc;
        background-image: url("../assets/leftBG.png");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: fixed;
        font-family: "Helvetica85";
        font-weight: 800;
        font-size: 22px;
        color: #3560a7;
        line-height: 85px;
        text-align: center;
        font-style: normal;
        text-transform: none;
        @include devices(tablet) {
          width: 150px;
          height: 70px;
          line-height: 70px;
          font-size: 21px;
          top: 415px;
        }
      }
    }
    .handDiv-r {
      position: absolute;
      top: 0;
      right: 0;
      margin-top: -55px;
      .hand-right {
        z-index: 999;
        position: relative;
        top: 450px;
        right: 80px;
        width: 160px;
        height: 85px;
        border-radius: 13px 13px 13px 13px;
        border: 1px solid #7791bc;
        background-image: url("../assets/leftBG.png");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: fixed;
        font-family: "Helvetica85";
        font-weight: 800;
        font-size: 22px;
        color: #3560a7;
        line-height: 85px;
        text-align: center;
        font-style: normal;
        text-transform: none;
        @include devices(tablet) {
          width: 150px;
          height: 70px;
          line-height: 70px;
          font-size: 21px;
          top: 415px;
        }
      }
    }
  }
  #hands {
    border-radius: 50%;
    overflow: hidden;
    width: 354px;
    height: 354px;
    border-radius: 50%;
    @include devices(tablet) {
      width: 300px;
      height: 300px;
    }
  }
  &-camera {
    margin-top: 15px;
    height: auto;
    background-color: rgba(206, 206, 206, 0.72);
  }
}
.performance {
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  align-items: center;
  backface-visibility: hidden;
  justify-content: center;
  .perfectImg {
    width: 399px;
    height: 69px;
  }
  .goodImg {
    width: 198px;
    height: 52px;
  }
}
.percentage {
  position: absolute;
  top: 150px;
  right: 20px;
  margin-right: 70px;
  @include devices(tablet) {
    top: 150px;
  }
}
.progress {
  .circle {
    width: 100px;
    height: 100px;
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
  height: 600px;
  object-fit: cover;
  transform: scaleY(-1);
  @include devices(tablet) {
    height: 440px;
  }
}
</style>
