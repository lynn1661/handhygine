#!/usr/bin/env python3
"""
Streamlit版洗手检测应用 - 纯Python实现
集成真实AI模型和MediaPipe离线检测
"""

import streamlit as st
import cv2
import numpy as np
import requests
import json
import time
import threading
from datetime import datetime
import mediapipe as mp
from PIL import Image
import logging

# 配置页面
st.set_page_config(
    page_title="智能洗手检测系统",
    page_icon="🧼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局变量
if 'current_step' not in st.session_state:
    st.session_state.current_step = 1
if 'detection_results' not in st.session_state:
    st.session_state.detection_results = []
if 'camera_active' not in st.session_state:
    st.session_state.camera_active = False
if 'mediapipe_hands' not in st.session_state:
    st.session_state.mediapipe_hands = None

# Flask后端配置
BACKEND_URL = "http://localhost:8000"

class MediaPipeHandDetector:
    """MediaPipe手部检测器"""
    
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
    def detect_hands(self, image):
        """检测手部关键点"""
        # 转换颜色空间
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_image)
        
        hand_data = {}
        
        if results.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # 获取手部标签（左手或右手）
                hand_label = "left" if idx == 0 else "right"
                
                # 提取关键点
                keypoints = []
                for landmark in hand_landmarks.landmark:
                    keypoints.append({
                        'x': landmark.x,
                        'y': landmark.y,
                        'z': landmark.z
                    })
                
                hand_data[hand_label] = [{
                    'keypoints': keypoints,
                    'score': 0.9  # MediaPipe置信度
                }]
                
                # 绘制关键点
                self.mp_drawing.draw_landmarks(
                    image, hand_landmarks, self.mp_hands.HAND_CONNECTIONS)
        
        return image, hand_data

def init_mediapipe():
    """初始化MediaPipe"""
    if st.session_state.mediapipe_hands is None:
        st.session_state.mediapipe_hands = MediaPipeHandDetector()
        st.success("✅ MediaPipe手部检测器初始化成功")

def send_detection_request(hand_data, step):
    """发送检测请求到Flask后端"""
    try:
        url = f"{BACKEND_URL}/api/handwash/analyze"
        payload = {
            "data": [hand_data] if hand_data else [],
            "step": step,
            "requestId": f"streamlit_{int(time.time())}_{step}"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"❌ 后端请求失败: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        st.error(f"❌ 连接后端失败: {e}")
        return None

def check_backend_health():
    """检查后端健康状态"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/handwash/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    # 应用标题
    st.title("🧼 智能洗手检测系统")
    st.markdown("**基于真实AI模型(ST-GCN)和MediaPipe的完全离线洗手检测系统**")
    
    # 侧边栏控制面板
    with st.sidebar:
        st.header("🎛️ 控制面板")
        
        # 后端状态检查
        backend_status = check_backend_health()
        if backend_status:
            st.success("✅ 后端服务正常")
        else:
            st.error("❌ 后端服务离线")
            st.info("请先启动Flask后端: `python app.py`")
            return
        
        # 摄像头控制
        st.subheader("📹 摄像头控制")
        camera_button = st.button("📸 启动/停止摄像头")
        if camera_button:
            st.session_state.camera_active = not st.session_state.camera_active
        
        # 当前步骤控制
        st.subheader("🔢 洗手步骤")
        step_options = {
            1: "手部准备/定位",
            2: "搓洗手心", 
            3: "搓洗手背",
            4: "搓洗指缝",
            5: "搓洗指尖",
            6: "搓洗拇指",
            7: "搓洗手腕"
        }
        
        selected_step = st.selectbox(
            "选择当前步骤",
            options=list(step_options.keys()),
            format_func=lambda x: f"步骤{x}: {step_options[x]}",
            index=st.session_state.current_step - 1
        )
        st.session_state.current_step = selected_step
        
        # 重置按钮
        if st.button("🔄 重置检测"):
            st.session_state.detection_results = []
            st.session_state.current_step = 1
            st.experimental_rerun()
    
    # 主内容区域
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("📹 实时视频检测")
        
        # 摄像头状态
        if st.session_state.camera_active:
            # 初始化MediaPipe
            init_mediapipe()
            
            # 摄像头容器
            video_container = st.empty()
            
            # 启动摄像头
            cap = cv2.VideoCapture(0)
            
            if not cap.isOpened():
                st.error("❌ 无法打开摄像头")
                return
            
            # 实时检测循环
            while st.session_state.camera_active:
                ret, frame = cap.read()
                if not ret:
                    st.error("❌ 摄像头读取失败")
                    break
                
                # 手部检测
                if st.session_state.mediapipe_hands:
                    annotated_frame, hand_data = st.session_state.mediapipe_hands.detect_hands(frame)
                    
                    # 如果检测到手部，发送到后端分析
                    if hand_data:
                        result = send_detection_request(hand_data, st.session_state.current_step)
                        if result:
                            # 保存结果
                            result['timestamp'] = datetime.now().strftime("%H:%M:%S")
                            st.session_state.detection_results.append(result)
                            
                            # 在视频上显示结果
                            cv2.putText(annotated_frame, 
                                      f"Step {result['step']}: {result['ans']}", 
                                      (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 
                                      (0, 255, 0) if result['ans'] == 'True' else (0, 0, 255), 2)
                            cv2.putText(annotated_frame, 
                                      f"Prob: {result['probability']:.2f}", 
                                      (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, 
                                      (255, 255, 255), 2)
                else:
                    annotated_frame = frame
                
                # 显示视频帧
                video_container.image(annotated_frame, channels="BGR", use_column_width=True)
                
                # 短暂延时
                time.sleep(0.1)
            
            cap.release()
            
        else:
            st.info("点击侧边栏的'启动摄像头'按钮开始检测")
            
            # 显示静态信息
            st.image("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZjlmYSIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2YjczODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfk7kg5pGE5YOP5aS05qOA5rWLPC90ZXh0Pgo8L3N2Zz4K", 
                     use_column_width=True)
    
    with col2:
        st.subheader("📊 检测结果")
        
        # 显示当前步骤
        st.info(f"🎯 当前步骤: **{st.session_state.current_step}** - {step_options[st.session_state.current_step]}")
        
        # 显示最近的检测结果
        if st.session_state.detection_results:
            st.subheader("🔍 最新结果")
            latest_result = st.session_state.detection_results[-1]
            
            # 结果状态
            if latest_result['ans'] == 'True':
                st.success(f"✅ 步骤{latest_result['step']} - 动作正确")
            else:
                st.error(f"❌ 步骤{latest_result['step']} - 动作需要改进")
            
            # 详细信息
            st.metric("置信度", f"{latest_result['probability']:.3f}")
            st.metric("阈值", f"{latest_result['threshold']}")
            st.metric("处理时间", f"{latest_result['processingTime']:.3f}s")
            
            # 进度条
            progress = st.session_state.current_step / 7
            st.progress(progress)
            st.caption(f"整体进度: {st.session_state.current_step}/7 步骤")
        
        # 历史结果
        if len(st.session_state.detection_results) > 1:
            st.subheader("📈 历史记录")
            
            # 显示最近10条记录
            recent_results = st.session_state.detection_results[-10:]
            
            for i, result in enumerate(reversed(recent_results)):
                with st.expander(f"[{result['timestamp']}] 步骤{result['step']} - {result['ans']}"):
                    st.json({
                        'step': result['step'],
                        'result': result['ans'],
                        'probability': result['probability'],
                        'processing_time': result['processingTime']
                    })
    
    # 底部信息
    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("🤖 AI模型", "ST-GCN")
    
    with col2:
        st.metric("📊 数据库", "SQLite") 
    
    with col3:
        st.metric("🔧 模式", "完全离线")
    
    # 使用说明
    with st.expander("📖 使用说明"):
        st.markdown("""
        ### 🧼 洗手步骤指南
        
        1. **步骤1**: 手部准备/定位 - 将双手放在摄像头前
        2. **步骤2**: 搓洗手心 - 双手掌心相对搓洗
        3. **步骤3**: 搓洗手背 - 手背放在另一手掌心搓洗
        4. **步骤4**: 搓洗指缝 - 十指交叉搓洗指缝
        5. **步骤5**: 搓洗指尖 - 弯曲手指在掌心搓洗指尖
        6. **步骤6**: 搓洗拇指 - 一手握住另一手拇指搓洗
        7. **步骤7**: 搓洗手腕 - 搓洗手腕部位
        
        ### 💡 操作提示
        - 点击左侧"启动摄像头"开始检测
        - 选择当前要检测的洗手步骤
        - 按照步骤指南进行洗手动作
        - 查看实时检测结果和置信度
        - 绿色表示动作正确，红色表示需要改进
        """)

if __name__ == "__main__":
    main() 