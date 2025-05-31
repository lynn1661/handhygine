import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
import requests
import json
import time
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from PIL import Image
import sqlite3
import hashlib
import base64
from io import BytesIO
import threading
import queue
import os

# 配置页面
st.set_page_config(
    page_title="手部卫生检测系统",
    page_icon="🧼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 配置设置
API_BASE_URL = "http://localhost:5001"

# 洗手步骤配置 - 包含GIF路径
HANDWASH_STEPS = {
    1: {"name": "掌心相对", "duration": 10, "description": "双手掌心相对，手指并拢相互摩擦", "gif": "assets/1.gif"},
    2: {"name": "手指交叉", "duration": 10, "description": "手心对手背沿指缝相互摩擦，双手交换进行", "gif": "assets/2.gif"},
    3: {"name": "手指相扣", "duration": 10, "description": "掌心相对，双手交叉沿指缝相互摩擦", "gif": "assets/3.gif"},
    4: {"name": "指尖搓洗", "duration": 10, "description": "弯曲各手指关节，在另一手掌心旋转搓擦", "gif": "assets/4.gif"},
    5: {"name": "拇指搓洗", "duration": 10, "description": "拇指在对侧手掌中旋转，双手交换进行", "gif": "assets/5.gif"},
    6: {"name": "指尖清洁", "duration": 10, "description": "弯曲各手指关节，把指尖合拢在另一手掌心旋转", "gif": "assets/6.gif"},
    7: {"name": "腕部清洁", "duration": 10, "description": "清洁手腕，双手交换进行", "gif": "assets/7.gif"}
}

# 全局状态
if 'current_step' not in st.session_state:
    st.session_state.current_step = 1
if 'detection_active' not in st.session_state:
    st.session_state.detection_active = False
if 'step_timer' not in st.session_state:
    st.session_state.step_timer = 0
if 'step_start_time' not in st.session_state:
    st.session_state.step_start_time = None
if 'detection_results' not in st.session_state:
    st.session_state.detection_results = []
if 'hands_detected_count' not in st.session_state:
    st.session_state.hands_detected_count = 0
if 'total_frames' not in st.session_state:
    st.session_state.total_frames = 0
if 'camera_active' not in st.session_state:
    st.session_state.camera_active = False

# 初始化MediaPipe
@st.cache_resource
def init_mediapipe():
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5
    )
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    return hands, mp_drawing, mp_hands, mp_drawing_styles

# 初始化数据库
@st.cache_resource
def init_database():
    conn = sqlite3.connect('handwash_app.db', check_same_thread=False)
    cursor = conn.cursor()
    
    # 创建用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建洗手记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS handwash_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            session_data TEXT,
            score INTEGER,
            duration REAL,
            steps_completed TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 创建用户反馈表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            feedback_text TEXT,
            rating INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    return conn

# 国际化支持
def get_translations():
    return {
        'zh': {
            'title': '手部卫生检测系统',
            'detecting': '检测中',
            'position_hands': '请将双手放置在摄像头前',
            'detection_description': '请保持手部在摄像头范围内，系统将自动识别洗手动作',
            'login': '登录',
            'register': '注册',
            'username': '用户名',
            'password': '密码',
            'role': '角色',
            'admin': '管理员',
            'user': '普通用户',
            'logout': '登出',
            'dashboard': '仪表板',
            'detection': '手部检测',
            'ranking': '排行榜',
            'feedback': '用户反馈',
            'admin_panel': '管理面板',
            'start_detection': '开始检测',
            'stop_detection': '停止检测',
            'next_step': '下一步',
            'complete_session': '完成检测',
            'start_camera': '启动摄像头',
            'stop_camera': '停止摄像头',
            'loading': '加载中...',
            'success': '成功完成',
            'failed': '检测失败',
            'score': '得分',
            'duration': '时长',
            'steps_completed': '完成步骤'
        },
        'en': {
            'title': 'Hand Hygiene Detection System',
            'detecting': 'Detecting',
            'position_hands': 'Please position your hands in front of the camera',
            'detection_description': 'Keep your hands within camera range, system will automatically recognize handwashing actions',
            'login': 'Login',
            'register': 'Register',
            'username': 'Username',
            'password': 'Password',
            'role': 'Role',
            'admin': 'Administrator',
            'user': 'User',
            'logout': 'Logout',
            'dashboard': 'Dashboard',
            'detection': 'Hand Detection',
            'ranking': 'Ranking',
            'feedback': 'User Feedback',
            'admin_panel': 'Admin Panel',
            'start_detection': 'Start Detection',
            'stop_detection': 'Stop Detection',
            'loading': 'Loading...',
            'success': 'Completed Successfully',
            'failed': 'Detection Failed',
            'score': 'Score',
            'duration': 'Duration',
            'steps_completed': 'Steps Completed'
        }
    }

# 用户认证函数
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def authenticate_user(username, password):
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    hashed_password = hash_password(password)
    cursor.execute('SELECT id, username, role FROM users WHERE username = ? AND password = ?', 
                   (username, hashed_password))
    user = cursor.fetchone()
    return user

def register_user(username, password, role='user'):
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    hashed_password = hash_password(password)
    try:
        cursor.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
                       (username, hashed_password, role))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False

# Flask后端通信
def test_backend():
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def send_keypoints_to_backend(keypoints_data, step):
    try:
        data = {
            "data": keypoints_data,
            "step": step,
            "requestId": f"step_{step}_{int(time.time())}"
        }
        response = requests.post(
            f"{API_BASE_URL}/api/handwash/analyze",
            json=data,
            timeout=15
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        st.error(f"后端通信错误: {str(e)}")
        return None

# 实时摄像头处理类
class CameraProcessor:
    def __init__(self):
        self.hands, self.mp_drawing, self.mp_hands, self.mp_drawing_styles = init_mediapipe()
        self.cap = None
        self.running = False
        self.last_frame = None
        self.error_message = None
        self.frame_count = 0
        
    def start_camera(self):
        """启动摄像头"""
        try:
            if self.cap is not None:
                self.cap.release()
            
            # 尝试多个摄像头索引
            for cam_index in [0, 1, 2]:
                self.cap = cv2.VideoCapture(cam_index)
                if self.cap.isOpened():
                    break
                self.cap.release()
            else:
                self.error_message = "无法找到可用的摄像头"
                return False
                
            # 设置摄像头参数
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 15)
            
            # 预热摄像头 - 读取几帧来稳定
            for _ in range(5):
                ret, frame = self.cap.read()
                if not ret:
                    self.error_message = "摄像头无法读取图像"
                    return False
                time.sleep(0.1)
                
            self.running = True
            self.error_message = None
            self.frame_count = 0
            return True
            
        except Exception as e:
            self.error_message = f"摄像头启动失败: {str(e)}"
            return False
            
    def stop_camera(self):
        """停止摄像头"""
        self.running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        self.last_frame = None
        self.frame_count = 0
            
    def get_frame_with_detection(self, enable_detection=False):
        """获取处理后的帧"""
        if not self.running or self.cap is None:
            return None, None
            
        try:
            ret, frame = self.cap.read()
            if not ret:
                self.error_message = "读取帧失败"
                return None, None
                
            self.frame_count += 1
            
            # 镜像翻转
            frame = cv2.flip(frame, 1)
            
            keypoints_data = []
            hands_count = 0
            
            if enable_detection:
                # 转换颜色空间进行MediaPipe处理
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.hands.process(rgb_frame)
                
                # 绘制检测结果
                if results.multi_hand_landmarks:
                    hands_count = len(results.multi_hand_landmarks)
                    
                    for hand_landmarks in results.multi_hand_landmarks:
                        # 绘制手部关键点
                        self.mp_drawing.draw_landmarks(
                            frame, 
                            hand_landmarks, 
                            self.mp_hands.HAND_CONNECTIONS,
                            self.mp_drawing_styles.get_default_hand_landmarks_style(),
                            self.mp_drawing_styles.get_default_hand_connections_style()
                        )
                        
                        # 提取关键点数据
                        landmarks = []
                        for landmark in hand_landmarks.landmark:
                            landmarks.append([landmark.x, landmark.y, landmark.z])
                        keypoints_data.append(landmarks)
                
                # 添加状态信息
                if st.session_state.detection_active:
                    current_step = st.session_state.current_step
                    step_info = HANDWASH_STEPS[current_step]
                    
                    # 计算剩余时间
                    if st.session_state.step_start_time:
                        elapsed = time.time() - st.session_state.step_start_time
                        remaining = max(0, step_info["duration"] - elapsed)
                    else:
                        remaining = step_info["duration"]
                    
                    # 添加文字覆盖
                    cv2.putText(frame, f"Step {current_step}: {step_info['name']}", 
                               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame, f"Time: {remaining:.1f}s", 
                               (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame, f"Hands: {hands_count}", 
                               (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # 添加帧计数信息
            cv2.putText(frame, f"Frame: {self.frame_count}", 
                       (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            self.last_frame = frame.copy()
            return frame, {"keypoints": keypoints_data, "hands_count": hands_count}
            
        except Exception as e:
            self.error_message = f"帧处理错误: {str(e)}"
            return None, None
    
    def get_camera_info(self):
        """获取摄像头信息"""
        if self.cap is None:
            return None
        
        return {
            "width": int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": int(self.cap.get(cv2.CAP_PROP_FPS)),
            "frame_count": self.frame_count,
            "backend": self.cap.get(cv2.CAP_PROP_BACKEND)
        }

# 保存洗手记录
def save_handwash_session(user_id, session_data, score, duration, steps_completed):
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO handwash_sessions (user_id, session_data, score, duration, steps_completed)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, json.dumps(session_data), score, duration, json.dumps(steps_completed)))
    conn.commit()

# 获取用户排行榜
def get_user_rankings():
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.username, 
               COUNT(h.id) as session_count,
               AVG(h.score) as avg_score,
               SUM(h.duration) as total_duration,
               MAX(h.created_at) as last_session
        FROM users u
        LEFT JOIN handwash_sessions h ON u.id = h.user_id
        GROUP BY u.id, u.username
        ORDER BY avg_score DESC, session_count DESC
    ''')
    return cursor.fetchall()

# 主应用逻辑
def main():
    # 初始化数据库连接
    if 'db_conn' not in st.session_state:
        st.session_state.db_conn = init_database()
    
    # 初始化摄像头处理器
    if 'camera_processor' not in st.session_state:
        st.session_state.camera_processor = CameraProcessor()
    
    # 语言选择
    translations = get_translations()
    language = st.sidebar.selectbox("Language/语言", ["zh"])
    t = translations[language]
    
    st.title(t['title'])
    
    # 用户认证状态
    if 'user' not in st.session_state:
        st.session_state.user = None
    
    # 侧边栏 - 用户认证
    with st.sidebar:
        if st.session_state.user is None:
            st.header(t['login'])
            
            tab1, tab2 = st.tabs([t['login'], t['register']])
            
            with tab1:
                login_username = st.text_input(t['username'], key="login_username")
                login_password = st.text_input(t['password'], type="password", key="login_password")
                
                if st.button(t['login']):
                    user = authenticate_user(login_username, login_password)
                    if user:
                        st.session_state.user = {
                            'id': user[0],
                            'username': user[1],
                            'role': user[2]
                        }
                        st.success(f"欢迎, {user[1]}!")
                        st.rerun()
                    else:
                        st.error("用户名或密码错误")
            
            with tab2:
                reg_username = st.text_input(t['username'], key="reg_username")
                reg_password = st.text_input(t['password'], type="password", key="reg_password")
                reg_role = st.selectbox(t['role'], ['user', 'admin'])
                
                if st.button(t['register']):
                    if register_user(reg_username, reg_password, reg_role):
                        st.success("注册成功！请登录。")
                    else:
                        st.error("用户名已存在")
        
        else:
            st.header(f"欢迎, {st.session_state.user['username']}")
            st.write(f"角色: {st.session_state.user['role']}")
            
            if st.button(t['logout']):
                st.session_state.user = None
                st.rerun()
    
    # 主内容区域
    if st.session_state.user is None:
        st.info("请先登录以使用系统功能")
        return
    
    # 导航菜单
    if st.session_state.user['role'] == 'admin':
        tabs = [t['dashboard'], t['detection'], t['ranking'], t['feedback'], t['admin_panel']]
    else:
        tabs = [t['dashboard'], t['detection'], t['ranking'], t['feedback']]
    
    selected_tab = st.selectbox("选择功能", tabs)
    
    # 仪表板页面
    if selected_tab == t['dashboard']:
        show_dashboard(t)
    
    # 手部检测页面
    elif selected_tab == t['detection']:
        show_realtime_detection_page(t)
    
    # 排行榜页面
    elif selected_tab == t['ranking']:
        show_ranking_page(t)
    
    # 用户反馈页面
    elif selected_tab == t['feedback']:
        show_feedback_page(t)
    
    # 管理员面板
    elif selected_tab == t['admin_panel'] and st.session_state.user['role'] == 'admin':
        show_admin_panel(t)

def show_realtime_detection_page(t):
    st.header("🧼 实时洗手检测")
    
    # 检查后端状态
    backend_status = test_backend()
    col_status1, col_status2 = st.columns(2)
    with col_status1:
        if backend_status:
            st.success("✅ Flask后端连接正常")
        else:
            st.warning("⚠️ Flask后端未启动")
    
    with col_status2:
        st.metric("当前步骤", f"{st.session_state.current_step}/7")
    
    # 默认启动摄像头
    if not st.session_state.camera_active:
        if st.session_state.camera_processor.start_camera():
            st.session_state.camera_active = True
            st.success("摄像头启动成功")
        else:
            error_msg = st.session_state.camera_processor.error_message or "摄像头启动失败"
            st.error(error_msg)
    
    # 主要布局 - 左中右三列
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col1:
        st.subheader("📋 步骤指导")
        
        # 当前步骤信息
        current_step = st.session_state.current_step
        step_info = HANDWASH_STEPS[current_step]
        
        st.info(f"**步骤 {current_step}: {step_info['name']}**")
        st.write(step_info['description'])
        
        # 显示指导GIF
        gif_path = step_info['gif']
        if os.path.exists(gif_path):
            try:
                st.image(gif_path, caption=f"步骤 {current_step} 指导动画", use_column_width=True)
            except:
                st.warning("无法加载指导动画")
        else:
            st.warning(f"指导动画文件不存在: {gif_path}")
        
        # 步骤进度
        st.subheader("🗓️ 步骤进度")
        for step_num in range(1, 8):
            if step_num < st.session_state.current_step:
                st.success(f"✅ 步骤 {step_num}: {HANDWASH_STEPS[step_num]['name']}")
            elif step_num == st.session_state.current_step:
                st.info(f"▶️ 步骤 {step_num}: {HANDWASH_STEPS[step_num]['name']}")
            else:
                st.text(f"⏳ 步骤 {step_num}: {HANDWASH_STEPS[step_num]['name']}")
    
    with col2:
        st.subheader("📹 实时视频检测")
        
        # 摄像头控制
        col_cam1, col_cam2, col_cam3 = st.columns(3)
        
        with col_cam1:
            if st.button("🔴 停止摄像头", disabled=not st.session_state.camera_active):
                st.session_state.camera_processor.stop_camera()
                st.session_state.camera_active = False
                st.session_state.detection_active = False
                st.info("摄像头已停止")
                st.rerun()
        
        with col_cam2:
            if st.button("📷 重启摄像头", disabled=st.session_state.camera_active):
                if st.session_state.camera_processor.start_camera():
                    st.session_state.camera_active = True
                    st.success("摄像头已启动")
                else:
                    error_msg = st.session_state.camera_processor.error_message or "摄像头启动失败"
                    st.error(error_msg)
                st.rerun()
        
        with col_cam3:
            if st.button("🔄 刷新视频"):
                st.rerun()
        
        # 自动刷新控制
        if st.session_state.camera_active:
            auto_refresh = st.checkbox("🔄 自动刷新视频", value=False, help="开启后每2秒自动刷新一次")
            if auto_refresh:
                st.info("⏰ 自动刷新已开启，2秒后刷新...")
                time.sleep(2)
                st.rerun()
        
        # 视频显示区域
        video_placeholder = st.empty()
        info_placeholder = st.empty()
        
        # 显示摄像头状态和视频
        if st.session_state.camera_active:
            # 获取是否启用检测
            enable_detection = st.session_state.detection_active
            
            try:
                frame, detection_data = st.session_state.camera_processor.get_frame_with_detection(enable_detection)
                
                if frame is not None:
                    # 转换为RGB并显示
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    video_placeholder.image(frame_rgb, channels="RGB", use_column_width=True)
                    
                    # 显示摄像头信息
                    camera_info = st.session_state.camera_processor.get_camera_info()
                    if camera_info:
                        info_text = f"📹 {camera_info['width']}x{camera_info['height']} | FPS: {camera_info['fps']} | 帧数: {camera_info['frame_count']}"
                        info_placeholder.caption(info_text)
                    
                    # 更新检测统计
                    if enable_detection and detection_data:
                        st.session_state.total_frames += 1
                        hands_count = detection_data.get('hands_count', 0)
                        st.session_state.hands_detected_count += hands_count
                        
                        # 保存检测数据
                        if detection_data['keypoints']:
                            frame_data = {
                                'timestamp': time.time(),
                                'keypoints': detection_data['keypoints'],
                                'hands_count': hands_count,
                                'step': current_step
                            }
                            st.session_state.detection_results.append(frame_data)
                else:
                    error_msg = st.session_state.camera_processor.error_message or "无法获取摄像头图像"
                    video_placeholder.error(f"❌ {error_msg}")
                    info_placeholder.empty()
                    
            except Exception as e:
                video_placeholder.error(f"❌ 视频处理错误: {str(e)}")
                info_placeholder.empty()
        else:
            video_placeholder.warning("📷 摄像头未启动，请点击重启摄像头")
            info_placeholder.empty()
        
        # 检测控制按钮
        st.subheader("🎮 检测控制")
        col_btn1, col_btn2, col_btn3, col_btn4 = st.columns(4)
        
        with col_btn1:
            if st.button("🚀 开始检测", disabled=st.session_state.detection_active or not st.session_state.camera_active):
                st.session_state.detection_active = True
                st.session_state.step_start_time = time.time()
                st.session_state.detection_results = []
                st.session_state.hands_detected_count = 0
                st.session_state.total_frames = 0
                st.success(f"开始检测步骤 {st.session_state.current_step}")
                st.rerun()
        
        with col_btn2:
            if st.button("⏹️ 停止检测", disabled=not st.session_state.detection_active):
                st.session_state.detection_active = False
                st.info("检测已停止")
                st.rerun()
        
        with col_btn3:
            if st.button("➡️ 下一步", disabled=st.session_state.current_step >= 7):
                if st.session_state.current_step < 7:
                    # 处理当前步骤结果
                    process_step_completion(backend_status)
                    # 进入下一步
                    st.session_state.current_step += 1
                    st.session_state.detection_active = False
                    st.success(f"进入步骤 {st.session_state.current_step}")
                    st.rerun()
        
        with col_btn4:
            if st.button("🏁 完成检测"):
                # 处理当前步骤结果
                process_step_completion(backend_status)
                # 完成整个检测流程
                complete_handwash_session(backend_status)
                st.success("洗手检测完成！")
                st.rerun()
        
        # 实时状态指示器
        if st.session_state.detection_active:
            st.success("🟢 检测进行中...")
            
            # 步骤计时器
            if st.session_state.step_start_time:
                elapsed = time.time() - st.session_state.step_start_time
                remaining = max(0, step_info["duration"] - elapsed)
                st.session_state.step_timer = remaining
                
                progress = min(1.0, elapsed / step_info["duration"])
                st.progress(progress)
                st.metric("剩余时间", f"{remaining:.1f}秒")
                
                # 自动进入下一步
                if remaining <= 0 and st.session_state.current_step < 7:
                    process_step_completion(backend_status)
                    st.session_state.current_step += 1
                    st.session_state.detection_active = False
                    st.success(f"自动进入步骤 {st.session_state.current_step}")
                    time.sleep(1)  # 短暂延迟
                    st.rerun()
                elif remaining <= 0 and st.session_state.current_step >= 7:
                    # 最后一步完成
                    process_step_completion(backend_status)
                    complete_handwash_session(backend_status)
                    st.session_state.detection_active = False
                    st.success("洗手检测完成！")
                    time.sleep(1)
                    st.rerun()
                    
                # 提醒用户点击刷新查看最新状态
                st.info("💡 点击'🔄 刷新视频'查看最新检测状态")
        else:
            st.info("⚪ 检测已停止")
    
    with col3:
        st.subheader("📊 检测数据")
        
        # 检测统计
        col_stat1, col_stat2 = st.columns(2)
        
        with col_stat1:
            st.metric("检测帧数", st.session_state.total_frames)
        
        with col_stat2:
            if st.session_state.total_frames > 0:
                detection_rate = (st.session_state.hands_detected_count / st.session_state.total_frames) * 100
                st.metric("检测率", f"{detection_rate:.1f}%")
            else:
                st.metric("检测率", "0%")
        
        # 检测到的手数统计
        st.metric("检测到手数", st.session_state.hands_detected_count)
        
        # 系统参数
        st.subheader("⚙️ 系统状态")
        system_status = {
            "最大手数": 2,
            "检测置信度": 0.7,
            "追踪置信度": 0.5,
            "后端状态": "正常" if backend_status else "未连接",
            "摄像头状态": "运行中" if st.session_state.camera_active else "已停止",
            "检测状态": "进行中" if st.session_state.detection_active else "已停止"
        }
        
        # 添加错误信息
        if st.session_state.camera_processor.error_message:
            system_status["错误信息"] = st.session_state.camera_processor.error_message
            
        st.json(system_status)

def process_step_completion(backend_status):
    """处理单个步骤完成"""
    if not st.session_state.detection_results:
        return
    
    current_step = st.session_state.current_step
    
    # 如果后端可用，发送数据进行AI分析
    if backend_status:
        with st.spinner(f"正在分析步骤 {current_step}..."):
            keypoints_sequence = [frame['keypoints'] for frame in st.session_state.detection_results]
            result = send_keypoints_to_backend(keypoints_sequence, current_step)
            
            if result:
                st.success(f"步骤 {current_step} 分析完成！")
                st.json(result)
            else:
                st.error(f"步骤 {current_step} AI分析失败")
    
    # 重置步骤数据
    st.session_state.detection_results = []
    st.session_state.hands_detected_count = 0
    st.session_state.total_frames = 0

def complete_handwash_session(backend_status):
    """完成整个洗手检测会话"""
    # 计算总分和时长
    total_duration = sum(HANDWASH_STEPS[i]["duration"] for i in range(1, st.session_state.current_step + 1))
    
    # 简单评分逻辑
    if st.session_state.total_frames > 0:
        detection_rate = (st.session_state.hands_detected_count / st.session_state.total_frames) * 100
        score = min(100, int(detection_rate))
    else:
        score = 0
    
    steps_completed = list(range(1, st.session_state.current_step + 1))
    
    # 保存到数据库
    save_handwash_session(
        st.session_state.user['id'],
        {"steps": steps_completed, "total_frames": st.session_state.total_frames},
        score,
        total_duration,
        steps_completed
    )
    
    # 重置状态
    st.session_state.current_step = 1
    st.session_state.detection_active = False
    st.session_state.detection_results = []

# 其他页面函数保持简化版本
def show_dashboard(t):
    st.header(t['dashboard'])
    st.info("仪表板功能正在开发中...")

def show_ranking_page(t):
    st.header(t['ranking'])
    st.info("排行榜功能正在开发中...")

def show_feedback_page(t):
    st.header(t['feedback'])
    st.info("反馈功能正在开发中...")

def show_admin_panel(t):
    st.header(t['admin_panel'])
    st.info("管理面板功能正在开发中...")

if __name__ == "__main__":
    main() 