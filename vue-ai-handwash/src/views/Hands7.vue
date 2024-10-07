<template>
  <div class="home">
    <div class="home-top">
      <div class="flex-item">
        <div class="home-title">STEP 7: Wrists</div>
        <div class="home-flex">
          <div class="home-img">
            <img id="hands" src="../assets/7.gif" alt="" />
          </div>
        </div>
      </div>
      <div
        v-if="countdownDisplay === 3 || countdownDisplay === 1"
        class="hand-left flex-item"
      >
        Left Hand
      </div>
      <div v-if="countdownDisplay === 2" class="hand-left flex-item">
        Right Hand
      </div>
      <div class="flex-item percentage progress">
        <el-progress
          type="circle"
          :percentage="percentage"
          :color="progressColor"
          ><span class="progress-text"
            >{{ countdownDisplay }}s</span
          ></el-progress
        >
      </div>
    </div>
    <div class="home-camera">
      <div class="container">
        <video class="input_video"></video>
        <canvas class="output_canvas" width="1280px" height="720px"></canvas>
        <div class="loading">
          <div class="spinner"></div>
          <div class="message">Loading</div>
        </div>
      </div>
      <div
        class="hexagon"
        v-if="countdownDisplay === 1 || countdownDisplay === 0"
      >
        <div class="hexagon-icon">
          <div>
            <img src="../assets/left.png" alt="" />
          </div>
          <div class="hexagon-l">L</div>
        </div>
      </div>
      <div
        class="hexagonR"
        v-if="countdownDisplay === 3 || countdownDisplay === 2"
      >
        <div class="hexagonR-icon">
          <div>
            <img src="../assets/right.png" alt="" />
          </div>
          <div class="hexagonR-R">R</div>
        </div>
      </div>
      <div class="performance">
        <div>{{ text }}</div>
      </div>
      <div class="control-panel"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as controls from "@mediapipe/control_utils";
import * as mpHands from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import DeviceDetector from "device-detector-js";
import { createConnect } from "../services/socket";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
const store = useStore();
const router = useRouter();
const progressColor = ref("blue");
// 倒计时逻辑
const percentage = ref(100);
const countdown = ref(3);
const countdownDisplay = ref(countdown.value);
const countdownStarted = ref(false);
const text = ref("");
let timer = null; // 声明计时器变量

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
      setTimeout(() => {
        stopCountdown();
      }, 1000);
    }
  }, 1000);
};
const studnetId = computed(() => {
  return store.state.user.userID;
});
async function stopCountdown() {
  try {
    clearInterval(timer);
    countdownDisplay.value = 0; // 设置为空字符串
    const matchCount = resList.filter((value) => value === "step: 7").length;
    if (matchCount >= 1) {
      text.value = "good";
    } else if (matchCount >= 2) {
      text.value = "prefect";
    } else {
      text.value = "you can do better";
    }
    await store.dispatch("user/rating", {
      id: studnetId.value,
      rating: text.value,
      is_last: true,
    });

    setTimeout(() => {
      router.push({
        path: "/handwashingCompletion",
      });
    }, 2500);
  } catch (e) {
    console.log(e);
  }
}
const combinedData = {};
const resList = []; // 用于存储每次的 res 值
onMounted(() => {
  testSupport([{ client: "Chrome" }]);
  createConnect(null);
  function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
      if (device.client !== undefined) {
        const re = new RegExp(`^${device.client}$`);
        if (!re.test(detectedDevice.client.name)) {
          continue;
        }
      }
      if (device.os !== undefined) {
        const re = new RegExp(`^${device.os}$`);
        if (!re.test(detectedDevice.os.name)) {
          continue;
        }
      }
      isSupported = true;
      break;
    }
    if (!isSupported) {
      // alert(
      //   `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
      //     `is not well supported at this time, continue at your own risk.`
      // );
    }
  }
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
  // We'll add this to our control panel later, but we'll save it here so we can
  // call tick() each time the graph runs.
  const fpsControl = new controls.FPS();
  // Optimization: Turn off animated spinner after its hiding animation is done.
  const spinner = document.querySelector(".loading");
  spinner.ontransitionend = () => {
    spinner.style.display = "none";
  };
  function onResults(results) {
    // Hide the spinner.
    document.body.classList.add("loaded");
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

    if (countdownDisplay.value > 0) {
      if (results.multiHandLandmarks && results.multiHandedness) {
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
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
            const keypoints3D = item.map((point) => ({
              x: point.x,
              y: point.y,
              z: point.z,
            }));
            const score = results.multiHandedness[index].score;
            const handedness = label;

            const newData = {
              keypoints,
              keypoints3D,
              score,
              handedness,
            };
            combinedData[label].push(newData);
          });
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
          const offsetConnections = mpHands.HAND_CONNECTIONS.map(
            (connection) => [connection[0] + offset, connection[1] + offset]
          );
          connections = connections.concat(offsetConnections);
          const classification = results.multiHandedness[loop];
          colors.push({
            list: offsetConnections.map((unused, i) => i + offset),
            color: classification.label,
          });
        }
      }
    }
  }
  let storedData = [];
  let newData = [];
  let startNumber = 0;
  let endNumber = 25;
  let firstType = true;
  //存储 25 条数据的函数
  function storeDataEverySecond(results) {
    storedData.push(results);
    if (firstType) {
      if (storedData.length > 25) {
        newData = storedData.slice(startNumber, endNumber);
        const res = createConnect(newData);
        if (res != null) {
          resList.push(res);
          // 统计匹配值出现的次数
        }
        firstType = false;
        newData = [];
        storedData.shift();
      }
    } else {
      storedData.shift();
      newData = storedData.slice(startNumber, endNumber);
      const res = createConnect(newData);
      if (res != null) {
        resList.push(res);
        // 统计匹配值出现的次数
      }
      newData = [];
      countdownStarted.value = true;
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
onUnmounted(() => {
  // 组件卸载前的清理操作
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.container {
  // bottom: 0;
}
.home {
  width: 100%;
  height: 100%;
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
    justify-content: center;
    align-items: center;
    color: rgba(16, 16, 16, 1);
    font-size: 48px;
    @include devices(tablet) {
      font-size: 28px;
      height: 70px;
    }
  }
  .home-flex {
    margin-top: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .home-img {
    position: relative;
    display: inline-block;
    width: 467px;
    height: 467px;
    border-radius: 50%;
    @include devices(tablet) {
      width: 350px;
      height: 350px;
    }
  }

  .home-img:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 52px solid rgb(208, 106, 142);
    box-sizing: border-box;
    transform: rotate(45deg);
  }

  #hands {
    border-radius: 50%;
    overflow: hidden;
    width: 467px;
    height: 467px;
    border-radius: 50%;
    @include devices(tablet) {
      width: 350px;
      height: 350px;
    }
  }
  &-camera {
    margin-top: 15px;
    height: auto;
    background-color: rgba(206, 206, 206, 0.72);
  }
}
.hexagon {
  width: 173px;
  height: 173px;
  position: absolute;
  &-icon {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &-l {
    position: absolute;
    color: rgba(154, 154, 154, 1);
    font-size: 50px;
    width: 36px;
    height: 48px;
    line-height: 70px;
  }
}
.hexagonR {
  width: 173px;
  height: 173px;
  position: absolute;
  right: 0;
  &-icon {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &-R {
    position: absolute;
    color: rgba(154, 154, 154, 1);
    font-size: 50px;
    width: 36px;
    height: 48px;
    line-height: 70px;
  }
}
.performance {
  text-align: center;
  width: 100%;
  position: absolute;
  font-size: 140px;
  color: aquamarine;
  margin-top: 31px;
  @include devices(tablet) {
    font-size: 70px;
    margin-top: 170px;
  }
}
.hand-left {
  position: absolute;
  top: 600px;
  left: 22px;
  width: 246px;
  height: 77px;
  line-height: 19px;
  color: rgba(108, 108, 108, 1);
  font-size: 45px;
  @include devices(tablet) {
    top: 410px;
  }
}
.percentage {
  position: absolute;
  top: 500px;
  right: 0;
  @include devices(tablet) {
    top: 320px;
  }
}
.progress {
  .progress-text {
    font-size: 38px;
    color: rgb(16, 16, 16);
  }
}
</style>
