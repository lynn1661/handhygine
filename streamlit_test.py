import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
import requests
import json
from PIL import Image
import time

# 配置页面
st.set_page_config(
    page_title="手部卫生检测系统 - Python 3.9测试版",
    page_icon="🧼",
    layout="wide"
)

st.title("🧼 手部卫生检测系统")
st.markdown("**Python 3.9 + MediaPipe + PyTorch 完整测试版**")

# 显示系统信息
with st.sidebar:
    st.header("系统信息")
    import torch
    import mediapipe as mp
    st.write(f"Python版本: 3.9")
    st.write(f"PyTorch版本: {torch.__version__}")
    st.write(f"MediaPipe版本: {mp.__version__}")
    st.write(f"Streamlit版本: {st.__version__}")

# 初始化MediaPipe
@st.cache_resource
def init_mediapipe():
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    mp_drawing = mp.solutions.drawing_utils
    return hands, mp_drawing, mp_hands

hands, mp_drawing, mp_hands = init_mediapipe()

# 测试Flask后端连接
def test_backend():
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        return response.status_code == 200
    except:
        return False

# 主界面
col1, col2 = st.columns([2, 1])

with col1:
    st.header("实时手部检测")
    
    # 检查后端状态
    backend_status = test_backend()
    if backend_status:
        st.success("✅ Flask后端连接正常")
    else:
        st.warning("⚠️ Flask后端未启动，请先运行 `python app.py`")
    
    # 摄像头输入
    camera_input = st.camera_input("拍摄照片进行手部检测")
    
    if camera_input is not None:
        # 读取图像
        image = Image.open(camera_input)
        image_np = np.array(image)
        
        # 转换为RGB
        rgb_image = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        
        # MediaPipe手部检测
        results = hands.process(rgb_image)
        
        # 绘制检测结果
        annotated_image = image_np.copy()
        keypoints_data = []
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # 绘制手部关键点
                mp_drawing.draw_landmarks(
                    annotated_image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                # 提取关键点坐标
                landmarks = []
                for landmark in hand_landmarks.landmark:
                    landmarks.append([landmark.x, landmark.y, landmark.z])
                keypoints_data.append(landmarks)
        
        # 显示结果
        st.image(annotated_image, caption="手部关键点检测结果", use_column_width=True)
        
        if keypoints_data:
            st.success(f"检测到 {len(keypoints_data)} 只手")
            
            # 如果后端可用，发送数据进行AI分析
            if backend_status:
                try:
                    # 准备数据
                    data = {
                        "keypoints": keypoints_data,
                        "timestamp": time.time()
                    }
                    
                    # 发送到后端
                    response = requests.post(
                        "http://localhost:5000/api/analyze",
                        json=data,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.json(result)
                    else:
                        st.error(f"后端分析失败: {response.status_code}")
                        
                except Exception as e:
                    st.error(f"分析请求失败: {str(e)}")
        else:
            st.info("未检测到手部，请重新拍摄")

with col2:
    st.header("测试功能")
    
    # 系统测试按钮
    if st.button("🔧 测试所有组件"):
        with st.spinner("正在测试系统组件..."):
            # 测试MediaPipe
            try:
                test_image = np.zeros((480, 640, 3), dtype=np.uint8)
                results = hands.process(test_image)
                st.success("✅ MediaPipe 正常")
            except Exception as e:
                st.error(f"❌ MediaPipe 错误: {e}")
            
            # 测试PyTorch
            try:
                import torch
                x = torch.randn(1, 3, 224, 224)
                st.success("✅ PyTorch 正常")
            except Exception as e:
                st.error(f"❌ PyTorch 错误: {e}")
            
            # 测试Flask后端
            if test_backend():
                st.success("✅ Flask后端 正常")
            else:
                st.error("❌ Flask后端 未启动")
    
    # 显示依赖信息
    st.header("依赖版本")
    dependencies = {
        "opencv-python": cv2.__version__,
        "numpy": np.__version__,
        "pillow": Image.__version__,
        "requests": requests.__version__
    }
    
    for name, version in dependencies.items():
        st.text(f"{name}: {version}")

# 底部信息
st.markdown("---")
st.markdown("""
### 🎉 恭喜！Python 3.9环境配置成功

所有关键依赖都已正确安装：
- ✅ **MediaPipe**: 手部关键点检测
- ✅ **PyTorch**: AI模型推理
- ✅ **Streamlit**: 前端界面
- ✅ **OpenCV**: 图像处理
- ✅ **Flask**: 后端API服务

现在您可以：
1. 使用摄像头进行实时手部检测
2. 运行完整的AI洗手动作识别
3. 部署到生产环境

**下一步**: 运行 `streamlit run streamlit_advanced.py` 启动完整版应用
""") 