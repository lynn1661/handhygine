<template>
  <div class="home">
    <div class="home-top">
      <div class="flex-item">
        <div class="home-title">
          <div style="margin-left: 76px">{{ $t("HandHygiene.step7") }}</div>
          <div class="back-home">
            <img src="../assets/blueHome.png" alt="" @click="backHome" />
          </div>
        </div>
        <div class="home-flex">
          <div class="home-img">
            <img id="hands" src="../assets/7.gif" alt="" />
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
        :download="downloadName + '-step7' + '.mp4'"
        style="display: none"
        >下载录制的视频</a
      >
    </div>
    <div style="margin: 26px 67px 0px 67px">
      <div class="home-camera">
        <div class="container">
          <video class="input_video"></video>
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
import { createConnect, disconnect } from "../services/socket";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { getTime } from "../utils/formatData";
const store = useStore();
const router = useRouter();
const progressColor = ref("blue");
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
    const mediaRecorderOptions = { mimeType: "video/webm" };
    mediaRecorder.value = new MediaRecorder(stream.value, mediaRecorderOptions);
    mediaRecorder.value.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    });

    mediaRecorder.value.addEventListener("stop", async () => {
      const blob = new Blob(recordedChunks.value, { type: "video/webm" });
      const videoData = await readBlobAsBase64(blob);
      store.commit("user/addBlob", videoData);
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
  countdown.value = 2; // 重置倒计时
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
const studnetId = computed(() => {
  return store.state.user.userID;
});
const redirectTimeoutId = ref(true);
async function stopCountdown() {
  try {
    clearInterval(timer);
    countdownDisplay.value = 0; // 设置为空字符串
    const trueCount = resList.filter(ans => ans === true).length;  // 统计 true 的数量
    if (trueCount >= 8 && trueCount < 20) {
      text.value = "GOOD";
    } else if (trueCount >= 20) {
      text.value = "PERFECT";
    } else {
      text.value = "FAIL";
    }
    await store.dispatch("user/rating", {
      id:
        sessionStorage.getItem("studnetID") ||
        localStorage.getItem("studnetID"),
      rating: text.value,
      is_last: true,
      step_video_file: `${downloadName.value}-step7`,
    });
    if (redirectTimeoutId.value) {
      setTimeout(() => {
        stopRecording();
        router.push({
          path: "/handwashingCompletion",
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

  function onResults(results) {
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
        storeDataEverySecond(combinedData);
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
  let currentStep = 7; // 当前步骤编号  
  //存储 25 条数据的函数
  async function storeDataEverySecond(results) {
    storedData.push(results);
    if (firstType) {
      if (storedData.length > 25) {
       newData = storedData.slice(startNumber, endNumber);
       try {
         const res = await createConnect(newData, currentStep);  // 等待服务器返回数据
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
