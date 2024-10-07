<template>
  <div class="home">
    <div>
      <select-locale></select-locale>
      <div class="home-title">Position Your Hands</div>
      <div class="home-content">
        Please apply hand sanitizer, spread the palms of both hands upwards, and
        stay for about 2-3 seconds until the detector recognizes your hands.
      </div>
    </div>
    <div class="home-camera" id="cameraH">
      <div class="container">
        <div
          style="display: flex; align-items: center; justify-content: center"
        >
          <div style="z-index: 1; position: absolute; margin-top: 100px">
            <div v-if="!completeDisplay" class="home-detect">Detecting...</div>
          </div>
        </div>
        <div v-if="completeDisplay" class="complete">
          <div style="width: 319px; height: 319px">
            <img src="../../public/success.png" alt="" />
          </div>
        </div>
        <video class="input_video"></video>
        <canvas class="output_canvas" width="1280px" height="720px"></canvas>
        <div class="loading">
          <div class="spinner"></div>
          <div class="message">Loading</div>
        </div>
        <div class="progress" v-if="!completeDisplay">
          <el-progress type="line" :stroke-width="66" :percentage="percentage"
            >{{ countdownDisplay }}s</el-progress
          >
        </div>
      </div>
      <div class="control-panel"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
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
        completeDisplay.value = true; // 显示Complete！
      }, 1000);
    }
  }, 1000);
};

const stopCountdown = () => {
  clearInterval(timer);
  countdownDisplay.value = 3;
  percentage.value = 100;
};
onMounted(() => {
  testSupport([{ client: "Chrome" }]);
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
      alert(
        `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
          `is not well supported at this time, continue at your own risk.`
      );
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
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === "Right";
        const landmarks = results.multiHandLandmarks[index];
        const combinedData = {};
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
watch(completeDisplay, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      router.push({
        path: "/hands",
      });
    }, 2500);
  }
});
onUnmounted(() => {
  // 组件卸载前的清理操作
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.container {
  @include devices(tablet) {
    margin-top: 15px;
  }
  margin-top: 55px;
}
.home {
  text-align: center;
  width: 100%;
  height: 100%;
  &-camera {
    height: auto;
    background-color: rgba(206, 206, 206, 0.72);
  }
  &-title {
    @include devices(tablet) {
      margin-top: 0px;
      font-size: 50px;
    }
    margin-top: 27px;
    color: rgba(55, 127, 127, 1);
    font-size: 80px;
  }
  &-content {
    @include devices(tablet) {
      margin: 13px 71px 0 71px;
      font-size: 20px;
    }
    color: rgba(42, 43, 46, 1);
    font-size: 28px;
    margin-top: 18px;
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
  margin: 21px;
  background-color: rgba(84, 188, 189, 1);
  :deep(.el-progress-bar__inner) {
    background-color: rgba(84, 188, 189, 1);
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
</style>
