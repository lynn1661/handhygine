import { createConnect, disconnect } from "./socket";
import DeviceDetector from "device-detector-js";

const mpHands = window;
const drawingUtils = window;
const controls = window;
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
const fpsControl = new controls.FPS();
const spinner = document.querySelector(".loading");
spinner.ontransitionend = () => {
  spinner.style.display = "none";
};
function onResults(results) {
  document.body.classList.add("loaded");
  fpsControl.tick();
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
          keypoints3D: [], // 初始化 keypoints3D 数组
          score,
          handedness,
        };

        combinedData[label].push(newData);
      });

      results.multiHandWorldLandmarks.forEach((item, index) => {
        const label = results.multiHandedness[index].label;
        const keypoints3D = item.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
        }));

        if (combinedData[label]) {
          const handData = combinedData[label];
          const matchingData = handData.find(
            (data) => data.handedness === label
          );

          if (matchingData) {
            matchingData.keypoints3D =
              keypoints3D.length > 0 ? keypoints3D : matchingData.keypoints3D;
          }
        }
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
    createConnect(null);
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
    for (let loop = 0; loop < results.multiHandWorldLandmarks.length; ++loop) {
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
//存储 25 条数据的函数
function storeDataEverySecond(results) {
  storedData.push(results);
  if (firstType) {
    if (storedData.length > 25) {
      newData = storedData.slice(startNumber, endNumber);
      createConnect(newData);
      firstType = false;
      newData = [];
      storedData.shift();
    }
  } else {
    storedData.shift();
    newData = storedData.slice(startNumber, endNumber);
    createConnect(newData);
    newData = [];
  }
}

const hands = new mpHands.Hands(config);
hands.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
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
const FPS = document.querySelector(".control-panel-fps");
FPS.style.display = "none";
