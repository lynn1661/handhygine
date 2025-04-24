import { createConnect } from "./socket";
import DeviceDetector from "device-detector-js";

// 全局变量
let hands = null;
let isInitializing = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;
let fpsControl = null;
let controlsElement = null;

// 支持检测
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
    console.warn(
      `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
        `is not well supported at this time, continue at your own risk.`
    );
  }
  return isSupported;
}

// 安全初始化MediaPipe Hands
async function safeInitializeHands(options = {}) {
  if (isInitializing || hands) return hands;
  
  try {
    isInitializing = true;
    console.log("初始化手部检测器...");
    
    // 查找DOM元素
    if (!videoElement) {
      videoElement = document.getElementsByClassName("input_video")[0];
    }
    if (!canvasElement) {
      canvasElement = document.getElementsByClassName("output_canvas")[0];
    }
    if (!controlsElement) {
      controlsElement = document.getElementsByClassName("control-panel")[0];
    }
    
    if (canvasElement && !canvasCtx) {
      canvasCtx = canvasElement.getContext("2d");
    }
    
    // 确保加载了必要的库
    const mpHands = window;
    const drawingUtils = window;
    const controls = window;
    
    // 重用FPS控制或创建新的
    if (!fpsControl && controls && controls.FPS) {
      fpsControl = new controls.FPS();
    }
    
    // 确保页面准备就绪
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 配置选项
    const defaultConfig = {
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
      },
    };
    
    // MediaPipe Hands实例
    try {
      // 关闭现有实例
      if (hands) {
        await hands.close();
        hands = null;
      }
      
      // 创建新实例
      hands = new mpHands.Hands(defaultConfig);
      
      // 设置结果回调
      hands.onResults((results) => safeOnResults(results, mpHands, drawingUtils));
      
      // 设置选项
      const defaultOptions = {
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        ...options
      };
      
      await hands.setOptions(defaultOptions);
      
      // 隐藏加载器
      const spinner = document.querySelector(".loading");
      if (spinner) {
        document.body.classList.add("loaded");
        spinner.ontransitionend = () => {
          spinner.style.display = "none";
        };
      }
      
      // 重置错误计数
      consecutiveErrors = 0;
      console.log("手部检测器初始化成功");
      
      // 设置控制面板
      if (controlsElement && controls && controls.ControlPanel) {
        setupControlPanel(controls, mpHands);
      }
      
      return hands;
    } catch (error) {
      console.error("MediaPipe Hands初始化失败:", error);
      throw error;
    }
  } catch (error) {
    console.error("初始化过程出错:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

// 安全处理结果
function safeOnResults(results, mpHands, drawingUtils) {
  try {
    // 隐藏加载指示器
    document.body.classList.add("loaded");
    
    // 更新帧率
    if (fpsControl) {
      fpsControl.tick();
    }
    
    // 绘制叠加层
    if (!canvasCtx || !canvasElement) return;
    
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
      // 成功处理，重置错误计数
      consecutiveErrors = 0;
      
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === "Right";
        const landmarks = results.multiHandLandmarks[index];
        
        // 准备要通过Socket发送的数据
        const combinedData = prepareHandData(results);
        
        // 发送到服务器
        createConnect(combinedData);
        
        // 绘制连接线
        if (drawingUtils && drawingUtils.drawConnectors && mpHands && mpHands.HAND_CONNECTIONS) {
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpHands.HAND_CONNECTIONS,
            { color: isRightHand ? "#00FF00" : "#FF0000" }
          );
        }
        
        // 绘制关键点
        if (drawingUtils && drawingUtils.drawLandmarks) {
          drawingUtils.drawLandmarks(canvasCtx, landmarks, {
            color: isRightHand ? "#00FF00" : "#FF0000",
            fillColor: isRightHand ? "#FF0000" : "#00FF00",
            radius: (data) => {
              return drawingUtils.lerp(data.from.z, -0.15, 0.1, 10, 1);
            },
          });
        }
      }
    }
    
    if (results.multiHandLandmarks.length === 0) {
      createConnect(null);
    }
    
    canvasCtx.restore();
    
  } catch (error) {
    handleDetectionError(error);
  }
}

// 准备手部数据
function prepareHandData(results) {
  if (!results.multiHandLandmarks || !results.multiHandedness) {
    return null;
  }
  
  const combinedData = {};
  
  // 初始化数据结构
  results.multiHandedness.forEach((item) => {
    const label = item.label;
    combinedData[label] = [];
  });
  
  // 填充数据
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
  
  return combinedData;
}

// 设置控制面板
function setupControlPanel(controls, mpHands) {
  if (!controls || !controlsElement || !hands) return;
  
  // 创建控制面板
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
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
              height = window.innerHeight;
              width = height / aspect;
            } else {
              width = window.innerWidth;
              height = width * aspect;
            }
            
            if (canvasElement) {
              canvasElement.width = width;
              canvasElement.height = height;
            }
            
            if (hands) {
              await hands.send({ image: input });
            }
          } catch (error) {
            handleDetectionError(error);
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
    .on((options) => {
      try {
        if (videoElement) {
          videoElement.classList.toggle("selfie", options.selfieMode);
        }
        
        if (hands) {
          hands.setOptions(options);
        }
      } catch (error) {
        console.error("设置选项出错:", error);
      }
    });
}

// 错误处理
function handleDetectionError(error) {
  console.error("手部检测出错:", error);
  consecutiveErrors++;
  
  // 检查是否是BindingError
  const isBindingError = error.name === 'BindingError' && 
    error.message.includes('Cannot pass deleted object');
  
  // 特定类型的错误或累积过多错误时重新初始化
  if (isBindingError || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.warn(`检测出现${consecutiveErrors}次错误，尝试重新初始化...`);
    
    // 重新初始化
    safeRestartHands();
  }
}

// 安全重启手部检测
async function safeRestartHands() {
  try {
    // 关闭现有实例
    if (hands) {
      try {
        await hands.close();
      } catch (e) {
        console.warn("关闭旧实例出错，继续重新初始化:", e);
      }
      hands = null;
    }
    
    // 重置错误计数
    consecutiveErrors = 0;
    
    // 延迟一会再初始化，避免可能的资源冲突
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 重新初始化
    await safeInitializeHands();
    
  } catch (error) {
    console.error("重新启动手部检测失败:", error);
  }
}

// 安全关闭手部检测
async function safeCloseHands() {
  if (!hands) return;
  
  try {
    console.log("正在关闭手部检测器...");
    await hands.close();
    hands = null;
    consecutiveErrors = 0;
    console.log("手部检测器已关闭");
  } catch (error) {
    console.error("关闭手部检测器出错:", error);
    // 强制设为null，即使关闭失败
    hands = null;
  }
}

// 初始化
(async function() {
  try {
    testSupport([{ client: "Chrome" }]);
    await safeInitializeHands();
  } catch (error) {
    console.error("初始化错误:", error);
  }
})();

// 导出的API
export {
  safeInitializeHands,
  safeRestartHands,
  safeCloseHands
};

// 清理函数 - 添加到window以便在页面卸载时调用
window.cleanupHandDetection = async function() {
  await safeCloseHands();
};

// 页面卸载时清理资源
window.addEventListener('beforeunload', async () => {
  await safeCloseHands();
});
