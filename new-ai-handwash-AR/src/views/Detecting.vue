<template>
  <div class="home">
    <div class="home-top">
      <div class="back-home">
        <img src="../assets/blueHome.png" alt="" @click="backHome" />
      </div>
    </div>
    <div>
      <div class="home-title">{{ $t("HandHygiene.positionYourHands") }}</div>
      <div class="home-content">
        {{ $t("HandHygiene.detectingWordDescription") }}
      </div>
    </div>
    <div class="progress" v-if="!completeDisplay">
      <div class="circle">
        <div>{{ countdownDisplay }}s</div>
      </div>
    </div>
    <div class="cameraHeight">
      <div class="home-camera" id="cameraH">
        <div class="container">
          <div v-if="completeDisplay" class="complete">
            <div style="width: 319px; height: 319px">
              <img
                src="../assets/success.png"
                style="width: 319px; height: 319px"
              />
            </div>
          </div>
          <video class="input_video"></video>
          <canvas class="output_canvas" width="1280px" height="720px"></canvas>
          <div class="loading">
            <div class="spinner"></div>
            <div class="message">Loading</div>
          </div>
          <div
            style="display: flex; align-items: center; justify-content: center"
          >
            <div class="detectFont">
              <div v-if="!completeDisplay">
                {{ $t("HandHygiene.detecting") }}...
              </div>
            </div>
          </div>
        </div>
        <div class="control-panel"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, reactive } from "vue";
import SelectLocale from "@/components/SelectLocale.vue";
import controls from "@mediapipe/control_utils";
import mpHands from "@mediapipe/hands";
import drawingUtils from "@mediapipe/drawing_utils";
import DeviceDetector from "device-detector-js";
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
            path: "/hands",
          });
        }, 2500);
      }
    }
  }, 1000);
};

const backHome = () => {
  state.redirectTimeoutId = false;
  localStorage.removeItem("studnetID");
  sessionStorage.removeItem("studnetID");
  router.push({
    path: "/",
  });
};
const stopCountdown = () => {
  clearInterval(timer);
  countdownDisplay.value = 3;
  percentage.value = 100;
};
onMounted(() => {
  // testSupport([{ client: "Chrome" }]);
  // function testSupport(supportedDevices) {
  //   const deviceDetector = new DeviceDetector();
  //   const detectedDevice = deviceDetector.parse(navigator.userAgent);
  //   let isSupported = false;
  //   for (const device of supportedDevices) {
  //     if (device.client !== undefined) {
  //       const re = new RegExp(`^${device.client}$`);
  //       if (!re.test(detectedDevice.client.name)) {
  //         continue;
  //       }
  //     }
  //     if (device.os !== undefined) {
  //       const re = new RegExp(`^${device.os}$`);
  //       if (!re.test(detectedDevice.os.name)) {
  //         continue;
  //       }
  //     }
  //     isSupported = true;
  //     break;
  //   }
  //   if (!isSupported) {
  //     alert(
  //       `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
  //         `is not well supported at this time, continue at your own risk.`
  //     );
  //   }
  // }
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
    if (results.multiHandLandmarks.length >= 2) {
      countdownStarted.value = true;
    }
    if (results.multiHandLandmarks.length <= 1) {
      countdownStarted.value = false;
    }
    canvasCtx.restore();
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
  } else {
    stopCountdown();
  }
});
onUnmounted(() => {
  // 组件卸载前的清理操作
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.container {
  margin: 25px;
  width: calc(100% - 90px);
  .detectFont {
    z-index: 1;
    position: absolute;
    margin-top: 70px;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 39px;
    color: #627390;
    line-height: 39px;
    text-align: center;
    font-style: normal;
    text-transform: none;
  }
}
.home {
  width: 100%;
  height: 100%;
  background-image: url("../assets/deletingBG.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  text-align: center;
  &-top {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 70px;
    .back-home {
      width: 75px;
      height: 75px;
      margin-right: 83px;
      margin-top: 54px;
      img {
        width: 100%;
        height: 100%;
      }
    }
  }
  .cameraHeight {
    background: #ffffff;
    height: 750px;
    margin: 10px;
  }
  &-camera {
    height: auto;
    background-color: rgba(206, 206, 206, 0.72);
  }
  &-title {
    @include devices(tablet) {
    }
    margin-top: 139px;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 39px;
    color: #0f387c;
    line-height: 39px;
    text-align: center;
    font-style: normal;
    text-transform: none;
  }
  &-content {
    font-family: "SourceHanSansCN";
    font-weight: 400;
    font-size: 26px;
    color: #07214b;
    line-height: 30px;
    text-align: center;
    font-style: normal;
    text-transform: none;
    margin: 20px;
    @include devices(tablet) {
      margin: 13px 71px 0 71px;
      font-size: 20px;
    }
  }
  &-detect {
    @include devices(tablet) {
      font-size: 60px;
    }
    width: 100%;
    color: rgba(108, 108, 108, 1);
    font-size: 70px;
  }
  &-number {
    width: 134px;
    height: 106px;
    color: white;
    background-color: #4095e5;
    font-size: 48px;
    line-height: 106px;
    text-align: center;
  }
}
.complete {
  z-index: 1;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  text-align: center;
}
.progress {
  position: absolute;
  z-index: 999;
  right: 0;
  margin-top: 80px;
  margin-right: 95px;
  @include devices(tablet) {
    margin-top: 45px;
    margin-right: 60px;
  }
  .circle {
    width: 123px;
    height: 123px;
    background: #f5f8fd;
    border: 1px solid #7791bc;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 65px;
    color: #4a5c79;
    line-height: 123px;
    text-align: center;
    font-style: normal;
    text-transform: none;
    border-radius: 50%;
  }
  :deep(.el-progress-bar__inner) {
    background-color: #f5f8fd;
    color: rgba(16, 16, 16, 1);
    border-radius: 0;
  }
  :deep(.el-progress-bar__outer) {
    border-radius: 0;
  }
  :deep(.el-progress-bar__innerText) {
    color: rgba(244, 238, 238, 1);
    font-size: 30px;
  }
  :deep(.el-progress__text) {
    position: absolute;
    color: rgba(244, 238, 238, 1);
    font-size: 30px;
    margin-left: 22px;
  }
}
.output_canvas {
  width: 100%;
  height: 650px;
  object-fit: cover;
  transform: scaleX(-1);
  @include devices(tablet) {
    height: 450px;
  }
}
</style>
