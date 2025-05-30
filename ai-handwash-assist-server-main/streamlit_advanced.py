#!/usr/bin/env python3
"""
高级版Streamlit洗手检测应用 - 完整功能实现
支持用户管理、历史记录、统计分析等
"""

import streamlit as st
import cv2
import numpy as np
import requests
import json
import time
import pandas as pd
from datetime import datetime, timedelta
import mediapipe as mp
from PIL import Image
import plotly.express as px
import plotly.graph_objects as go
import logging

# 配置页面
st.set_page_config(
    page_title="智能洗手检测系统",
    page_icon="🧼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义CSS样式
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
    }
    .step-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #007bff;
        margin: 0.5rem 0;
    }
    .success-card {
        background: #d4edda;
        border-left: 4px solid #28a745;
    }
    .warning-card {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
    }
    .error-card {
        background: #f8d7da;
        border-left: 4px solid #dc3545;
    }
</style>
""", unsafe_allow_html=True)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask后端配置
BACKEND_URL = "http://localhost:8000"

# 初始化session state
if 'current_step' not in st.session_state:
    st.session_state.current_step = 1
if 'detection_results' not in st.session_state:
    st.session_state.detection_results = []
if 'camera_active' not in st.session_state:
    st.session_state.camera_active = False
if 'mediapipe_hands' not in st.session_state:
    st.session_state.mediapipe_hands = None
if 'user_info' not in st.session_state:
    st.session_state.user_info = None
if 'session_stats' not in st.session_state:
    st.session_state.session_stats = {
        'total_detections': 0,
        'correct_actions': 0,
        'session_start': datetime.now()
    }

class MediaPipeHandDetector:
    """增强版MediaPipe手部检测器"""
    
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
    def detect_hands(self, image):
        """检测手部关键点并美化显示"""
        # 转换颜色空间
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_image)
        
        hand_data = {}
        hand_count = 0
        
        if results.multi_hand_landmarks and results.multi_handedness:
            for idx, (hand_landmarks, handedness) in enumerate(zip(results.multi_hand_landmarks, results.multi_handedness)):
                # 获取手部标签
                hand_label = handedness.classification[0].label.lower()
                
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
                    'score': handedness.classification[0].score
                }]
                
                # 美化绘制关键点
                self.mp_drawing.draw_landmarks(
                    image, 
                    hand_landmarks, 
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
                
                hand_count += 1
                
                # 在图像上显示手部标签
                h, w, _ = image.shape
                x = int(hand_landmarks.landmark[0].x * w)
                y = int(hand_landmarks.landmark[0].y * h)
                cv2.putText(image, f"{hand_label.upper()}", (x, y-20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        return image, hand_data, hand_count

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
        if response.status_code == 200:
            return True, response.json()
        return False, None
    except:
        return False, None

def get_backend_stats():
    """获取后端统计信息"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/handwash/stats", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def user_login_panel():
    """用户登录面板"""
    with st.sidebar.expander("👤 用户登录", expanded=not st.session_state.user_info):
        if not st.session_state.user_info:
            username = st.text_input("用户名", value="demo_user")
            if st.button("登录"):
                # 简单的演示登录
                st.session_state.user_info = {
                    'username': username,
                    'login_time': datetime.now()
                }
                st.success(f"✅ 欢迎, {username}!")
                st.experimental_rerun()
        else:
            st.success(f"✅ 已登录: {st.session_state.user_info['username']}")
            if st.button("退出登录"):
                st.session_state.user_info = None
                st.experimental_rerun()

def step_progress_visualization():
    """步骤进度可视化"""
    steps = {
        1: "手部准备/定位",
        2: "搓洗手心", 
        3: "搓洗手背",
        4: "搓洗指缝",
        5: "搓洗指尖",
        6: "搓洗拇指",
        7: "搓洗手腕"
    }
    
    # 创建进度图表
    fig = go.Figure()
    
    # 添加进度条
    for i in range(1, 8):
        color = '#28a745' if i <= st.session_state.current_step else '#e9ecef'
        fig.add_trace(go.Bar(
            x=[steps[i]],
            y=[1],
            name=f"步骤{i}",
            marker_color=color,
            showlegend=False
        ))
    
    fig.update_layout(
        title="洗手步骤进度",
        xaxis_title="步骤",
        yaxis_title="完成状态",
        height=300,
        margin=dict(l=0, r=0, t=40, b=0)
    )
    
    st.plotly_chart(fig, use_container_width=True)

def session_statistics():
    """会话统计"""
    stats = st.session_state.session_stats
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("总检测次数", stats['total_detections'])
    
    with col2:
        accuracy = (stats['correct_actions'] / max(stats['total_detections'], 1)) * 100
        st.metric("准确率", f"{accuracy:.1f}%")
    
    with col3:
        session_duration = datetime.now() - stats['session_start']
        st.metric("会话时长", f"{session_duration.seconds // 60}分钟")
    
    with col4:
        st.metric("正确动作", stats['correct_actions'])

def detection_history_chart():
    """检测历史图表"""
    if len(st.session_state.detection_results) > 1:
        # 准备数据
        df = pd.DataFrame(st.session_state.detection_results)
        df['timestamp'] = pd.to_datetime(df['timestamp'], format='%H:%M:%S')
        df['success'] = df['ans'] == 'True'
        
        # 创建时间序列图表
        fig = px.line(df, x='timestamp', y='probability', 
                     color='step', title='检测置信度时间序列')
        st.plotly_chart(fig, use_container_width=True)
        
        # 创建成功率饼图
        success_count = df['success'].sum()
        total_count = len(df)
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=['成功', '失败'],
            values=[success_count, total_count - success_count],
            hole=.3
        )])
        fig_pie.update_layout(title="动作成功率", height=300)
        st.plotly_chart(fig_pie, use_container_width=True)

def main():
    # 应用标题
    st.markdown("""
    <div class="main-header">
        <h1>🧼 智能洗手检测系统</h1>
        <p>基于真实AI模型(ST-GCN)和MediaPipe的完全离线洗手检测系统</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 侧边栏控制面板
    with st.sidebar:
        st.header("🎛️ 控制面板")
        
        # 用户登录
        user_login_panel()
        
        # 后端状态检查
        backend_status, backend_info = check_backend_health()
        if backend_status:
            st.success("✅ 后端服务正常")
            if backend_info:
                st.caption(f"模型池: {backend_info.get('modelPool', {}).get('available', 0)}个可用")
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
        
        # 自动模式
        auto_mode = st.checkbox("🤖 自动步骤切换")
        
        # 重置按钮
        if st.button("🔄 重置检测"):
            st.session_state.detection_results = []
            st.session_state.current_step = 1
            st.session_state.session_stats = {
                'total_detections': 0,
                'correct_actions': 0,
                'session_start': datetime.now()
            }
            st.experimental_rerun()
    
    # 主要标签页
    tab1, tab2, tab3, tab4 = st.tabs(["🎥 实时检测", "📊 数据统计", "📈 历史记录", "⚙️ 系统信息"])
    
    with tab1:
        # 实时检测界面
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.subheader("📹 实时视频检测")
            
            # 摄像头状态
            if st.session_state.camera_active:
                # 初始化MediaPipe
                init_mediapipe()
                
                # 创建视频容器
                video_container = st.empty()
                status_container = st.empty()
                
                # 启动摄像头
                cap = cv2.VideoCapture(0)
                
                if not cap.isOpened():
                    st.error("❌ 无法打开摄像头")
                    return
                
                frame_count = 0
                last_detection_time = time.time()
                
                # 实时检测循环
                while st.session_state.camera_active:
                    ret, frame = cap.read()
                    if not ret:
                        st.error("❌ 摄像头读取失败")
                        break
                    
                    frame_count += 1
                    
                    # 手部检测
                    if st.session_state.mediapipe_hands:
                        annotated_frame, hand_data, hand_count = st.session_state.mediapipe_hands.detect_hands(frame)
                        
                        # 显示手部数量
                        cv2.putText(annotated_frame, f"Hands: {hand_count}", 
                                   (10, annotated_frame.shape[0] - 20), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        
                        # 控制检测频率（每2秒检测一次）
                        current_time = time.time()
                        if hand_data and (current_time - last_detection_time) > 2:
                            result = send_detection_request(hand_data, st.session_state.current_step)
                            if result:
                                # 更新统计
                                st.session_state.session_stats['total_detections'] += 1
                                if result['ans'] == 'True':
                                    st.session_state.session_stats['correct_actions'] += 1
                                
                                # 保存结果
                                result['timestamp'] = datetime.now().strftime("%H:%M:%S")
                                st.session_state.detection_results.append(result)
                                
                                # 在视频上显示结果
                                result_color = (0, 255, 0) if result['ans'] == 'True' else (0, 0, 255)
                                cv2.putText(annotated_frame, 
                                           f"Step {result['step']}: {result['ans']}", 
                                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 
                                           result_color, 2)
                                cv2.putText(annotated_frame, 
                                           f"Confidence: {result['probability']:.2f}", 
                                           (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, 
                                           (255, 255, 255), 2)
                                
                                # 自动步骤切换
                                if auto_mode and result['ans'] == 'True' and st.session_state.current_step < 7:
                                    st.session_state.current_step += 1
                                
                                last_detection_time = current_time
                    else:
                        annotated_frame = frame
                    
                    # 显示FPS
                    cv2.putText(annotated_frame, f"Frame: {frame_count}", 
                               (annotated_frame.shape[1] - 150, 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    
                    # 显示视频帧
                    video_container.image(annotated_frame, channels="BGR", use_column_width=True)
                    
                    # 短暂延时
                    time.sleep(0.05)  # 约20 FPS
                
                cap.release()
                
            else:
                st.info("点击侧边栏的'启动摄像头'按钮开始检测")
                
                # 显示洗手步骤指南
                st.subheader("🧼 洗手步骤指南")
                for i, desc in step_options.items():
                    icon = "✅" if i <= st.session_state.current_step else "⭕"
                    st.markdown(f"{icon} **步骤{i}**: {desc}")
        
        with col2:
            st.subheader("📊 实时状态")
            
            # 当前步骤显示
            current_step_desc = step_options[st.session_state.current_step]
            st.markdown(f"""
            <div class="step-card">
                <h4>🎯 当前步骤: {st.session_state.current_step}</h4>
                <p>{current_step_desc}</p>
            </div>
            """, unsafe_allow_html=True)
            
            # 会话统计
            st.subheader("📈 会话统计")
            session_statistics()
            
            # 最新检测结果
            if st.session_state.detection_results:
                st.subheader("🔍 最新结果")
                latest_result = st.session_state.detection_results[-1]
                
                card_class = "success-card" if latest_result['ans'] == 'True' else "error-card"
                st.markdown(f"""
                <div class="step-card {card_class}">
                    <h5>步骤{latest_result['step']}: {latest_result['ans']}</h5>
                    <p>置信度: {latest_result['probability']:.3f}</p>
                    <p>处理时间: {latest_result['processingTime']:.3f}s</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 进度条
                progress = st.session_state.current_step / 7
                st.progress(progress)
                st.caption(f"整体进度: {st.session_state.current_step}/7 步骤")
    
    with tab2:
        st.subheader("📊 数据统计分析")
        
        # 步骤进度可视化
        step_progress_visualization()
        
        # 检测历史图表
        if st.session_state.detection_results:
            detection_history_chart()
        else:
            st.info("开始检测后将显示统计图表")
    
    with tab3:
        st.subheader("📈 检测历史记录")
        
        if st.session_state.detection_results:
            # 显示数据表
            df = pd.DataFrame(st.session_state.detection_results)
            st.dataframe(df, use_container_width=True)
            
            # 导出功能
            csv = df.to_csv(index=False)
            st.download_button(
                label="📥 下载CSV",
                data=csv,
                file_name=f"handwash_detection_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
        else:
            st.info("暂无检测记录")
    
    with tab4:
        st.subheader("⚙️ 系统信息")
        
        # 后端状态
        backend_stats = get_backend_stats()
        if backend_stats:
            st.json(backend_stats)
        
        # 系统配置
        st.subheader("🔧 系统配置")
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("🤖 AI模型", "ST-GCN")
            st.metric("📊 数据库", "SQLite")
        
        with col2:
            st.metric("🔧 模式", "完全离线")
            st.metric("🎥 前端", "Streamlit (Python)")
        
        # 性能监控
        st.subheader("📈 性能监控")
        if st.session_state.detection_results:
            processing_times = [r['processingTime'] for r in st.session_state.detection_results]
            avg_time = np.mean(processing_times)
            st.metric("平均处理时间", f"{avg_time:.3f}s")
            
            # 处理时间图表
            fig = px.line(y=processing_times, title="处理时间趋势")
            st.plotly_chart(fig, use_container_width=True)

if __name__ == "__main__":
    main() 