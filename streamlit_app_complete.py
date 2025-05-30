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

# 配置页面
st.set_page_config(
    page_title="手部卫生检测系统",
    page_icon="🧼",
    layout="wide",
    initial_sidebar_state="expanded"
)

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
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def send_keypoints_to_backend(keypoints_data):
    try:
        data = {
            "keypoints": keypoints_data,
            "timestamp": time.time()
        }
        response = requests.post(
            "http://localhost:5000/api/analyze",
            json=data,
            timeout=15
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        st.error(f"后端通信错误: {str(e)}")
        return None

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
    
    # 初始化MediaPipe
    hands, mp_drawing, mp_hands, mp_drawing_styles = init_mediapipe()
    
    # 语言选择
    translations = get_translations()
    language = st.sidebar.selectbox("Language/语言", ["zh", "en"])
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
        show_detection_page(hands, mp_drawing, mp_hands, mp_drawing_styles, t)
    
    # 排行榜页面
    elif selected_tab == t['ranking']:
        show_ranking_page(t)
    
    # 用户反馈页面
    elif selected_tab == t['feedback']:
        show_feedback_page(t)
    
    # 管理员面板
    elif selected_tab == t['admin_panel'] and st.session_state.user['role'] == 'admin':
        show_admin_panel(t)

def show_dashboard(t):
    st.header(t['dashboard'])
    
    # 用户统计
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    
    user_id = st.session_state.user['id']
    
    # 获取用户统计数据
    cursor.execute('''
        SELECT COUNT(*) as session_count,
               AVG(score) as avg_score,
               SUM(duration) as total_duration
        FROM handwash_sessions 
        WHERE user_id = ?
    ''', (user_id,))
    
    stats = cursor.fetchone()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("总检测次数", stats[0] or 0)
    
    with col2:
        st.metric("平均得分", f"{stats[1]:.1f}" if stats[1] else "0.0")
    
    with col3:
        st.metric("总时长 (秒)", f"{stats[2]:.1f}" if stats[2] else "0.0")
    
    # 最近的检测记录
    st.subheader("最近检测记录")
    cursor.execute('''
        SELECT score, duration, created_at
        FROM handwash_sessions 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    ''', (user_id,))
    
    recent_sessions = cursor.fetchall()
    
    if recent_sessions:
        df = pd.DataFrame(recent_sessions, columns=['得分', '时长(秒)', '检测时间'])
        st.dataframe(df, use_container_width=True)
        
        # 得分趋势图
        fig = px.line(df, x='检测时间', y='得分', title='得分趋势')
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("暂无检测记录")

def show_detection_page(hands, mp_drawing, mp_hands, mp_drawing_styles, t):
    st.header(t['detection'])
    
    # 检查后端状态
    backend_status = test_backend()
    if backend_status:
        st.success("✅ Flask后端连接正常")
    else:
        st.warning("⚠️ Flask后端未启动，请先运行 `python app.py`")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader(t['position_hands'])
        st.write(t['detection_description'])
        
        # 初始化会话状态
        if 'detection_active' not in st.session_state:
            st.session_state.detection_active = False
        if 'detection_data' not in st.session_state:
            st.session_state.detection_data = []
        if 'detection_start_time' not in st.session_state:
            st.session_state.detection_start_time = None
        
        # 控制按钮
        col_btn1, col_btn2 = st.columns(2)
        
        with col_btn1:
            if st.button(t['start_detection'], disabled=st.session_state.detection_active):
                st.session_state.detection_active = True
                st.session_state.detection_data = []
                st.session_state.detection_start_time = time.time()
        
        with col_btn2:
            if st.button(t['stop_detection'], disabled=not st.session_state.detection_active):
                if st.session_state.detection_active:
                    # 处理检测结果
                    process_detection_results(backend_status, t)
                st.session_state.detection_active = False
        
        # 相机输入
        if st.session_state.detection_active:
            camera_input = st.camera_input("拍摄进行手部检测")
            
            if camera_input is not None:
                process_camera_input(camera_input, hands, mp_drawing, mp_hands, mp_drawing_styles, t)
    
    with col2:
        st.subheader("检测状态")
        
        if st.session_state.detection_active:
            st.success("🟢 检测进行中...")
            if st.session_state.detection_start_time:
                elapsed = time.time() - st.session_state.detection_start_time
                st.metric("已检测时间", f"{elapsed:.1f}秒")
            st.metric("数据帧数", len(st.session_state.detection_data))
        else:
            st.info("⚪ 检测已停止")
        
        # 显示检测参数
        st.subheader("检测参数")
        st.json({
            "最大手数": 2,
            "检测置信度": 0.7,
            "追踪置信度": 0.5,
            "后端状态": "正常" if backend_status else "未连接"
        })

def process_camera_input(camera_input, hands, mp_drawing, mp_hands, mp_drawing_styles, t):
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
                annotated_image, 
                hand_landmarks, 
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style()
            )
            
            # 提取关键点坐标
            landmarks = []
            for landmark in hand_landmarks.landmark:
                landmarks.append([landmark.x, landmark.y, landmark.z])
            keypoints_data.append(landmarks)
    
    # 显示结果
    st.image(annotated_image, caption="手部关键点检测结果", use_column_width=True)
    
    # 保存检测数据
    if keypoints_data:
        frame_data = {
            'timestamp': time.time(),
            'keypoints': keypoints_data,
            'hands_count': len(keypoints_data)
        }
        st.session_state.detection_data.append(frame_data)
        
        st.success(f"检测到 {len(keypoints_data)} 只手")
    else:
        st.info("未检测到手部")

def process_detection_results(backend_status, t):
    if not st.session_state.detection_data:
        st.warning("没有检测数据")
        return
    
    duration = time.time() - st.session_state.detection_start_time
    
    # 如果后端可用，发送数据进行AI分析
    if backend_status and st.session_state.detection_data:
        with st.spinner("正在分析洗手动作..."):
            # 准备数据发送到后端
            keypoints_sequence = [frame['keypoints'] for frame in st.session_state.detection_data]
            result = send_keypoints_to_backend(keypoints_sequence)
            
            if result:
                score = result.get('score', 0)
                steps_completed = result.get('steps_completed', [])
                analysis = result.get('analysis', {})
                
                # 保存到数据库
                save_handwash_session(
                    st.session_state.user['id'],
                    st.session_state.detection_data,
                    score,
                    duration,
                    steps_completed
                )
                
                # 显示结果
                st.success(f"检测完成！得分: {score}")
                st.json(result)
            else:
                st.error("AI分析失败")
    else:
        # 简单的本地分析
        frames_count = len(st.session_state.detection_data)
        hands_detected = sum(1 for frame in st.session_state.detection_data if frame['hands_count'] > 0)
        score = int((hands_detected / frames_count) * 100) if frames_count > 0 else 0
        
        # 保存到数据库
        save_handwash_session(
            st.session_state.user['id'],
            st.session_state.detection_data,
            score,
            duration,
            ['hand_detection']
        )
        
        st.success(f"检测完成！得分: {score}，时长: {duration:.1f}秒")

def show_ranking_page(t):
    st.header(t['ranking'])
    
    rankings = get_user_rankings()
    
    if rankings:
        df = pd.DataFrame(rankings, columns=[
            '用户名', '检测次数', '平均得分', '总时长(秒)', '最后检测时间'
        ])
        
        # 格式化数据
        df['平均得分'] = df['平均得分'].round(2)
        df['总时长(秒)'] = df['总时长(秒)'].round(2)
        
        st.dataframe(df, use_container_width=True)
        
        # 可视化排行榜
        if len(df) > 0:
            fig = px.bar(df.head(10), x='用户名', y='平均得分', 
                        title='用户平均得分排行榜 (前10名)')
            st.plotly_chart(fig, use_container_width=True)
            
            # 检测次数分布
            fig2 = px.pie(df, values='检测次数', names='用户名', 
                         title='用户检测次数分布')
            st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("暂无排行数据")

def show_feedback_page(t):
    st.header(t['feedback'])
    
    # 提交反馈表单
    with st.form("feedback_form"):
        st.subheader("提交反馈")
        feedback_text = st.text_area("反馈内容", height=150)
        rating = st.slider("评分", 1, 5, 3)
        
        submitted = st.form_submit_button("提交反馈")
        
        if submitted and feedback_text:
            conn = st.session_state.db_conn
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO user_feedback (user_id, feedback_text, rating)
                VALUES (?, ?, ?)
            ''', (st.session_state.user['id'], feedback_text, rating))
            conn.commit()
            st.success("反馈提交成功！")
    
    # 显示用户的历史反馈
    st.subheader("我的反馈历史")
    conn = st.session_state.db_conn
    cursor = conn.cursor()
    cursor.execute('''
        SELECT feedback_text, rating, created_at
        FROM user_feedback
        WHERE user_id = ?
        ORDER BY created_at DESC
    ''', (st.session_state.user['id'],))
    
    user_feedback = cursor.fetchall()
    
    if user_feedback:
        for feedback in user_feedback:
            with st.expander(f"评分: {feedback[1]}/5 - {feedback[2]}"):
                st.write(feedback[0])
    else:
        st.info("暂无反馈记录")

def show_admin_panel(t):
    st.header(t['admin_panel'])
    
    tab1, tab2, tab3 = st.tabs(["用户管理", "系统统计", "反馈管理"])
    
    with tab1:
        st.subheader("用户管理")
        conn = st.session_state.db_conn
        cursor = conn.cursor()
        
        # 显示所有用户
        cursor.execute('SELECT id, username, role, created_at FROM users')
        users = cursor.fetchall()
        
        df_users = pd.DataFrame(users, columns=['ID', '用户名', '角色', '创建时间'])
        st.dataframe(df_users, use_container_width=True)
    
    with tab2:
        st.subheader("系统统计")
        
        # 总体统计
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM handwash_sessions')
        total_sessions = cursor.fetchone()[0]
        
        cursor.execute('SELECT AVG(score) FROM handwash_sessions')
        avg_score = cursor.fetchone()[0]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("总用户数", total_users)
        with col2:
            st.metric("总检测次数", total_sessions)
        with col3:
            st.metric("平均得分", f"{avg_score:.2f}" if avg_score else "0.00")
        
        # 每日统计
        cursor.execute('''
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM handwash_sessions
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        ''')
        daily_stats = cursor.fetchall()
        
        if daily_stats:
            df_daily = pd.DataFrame(daily_stats, columns=['日期', '检测次数'])
            fig = px.line(df_daily, x='日期', y='检测次数', title='每日检测次数趋势')
            st.plotly_chart(fig, use_container_width=True)
    
    with tab3:
        st.subheader("用户反馈管理")
        
        cursor.execute('''
            SELECT u.username, f.feedback_text, f.rating, f.created_at
            FROM user_feedback f
            JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        ''')
        feedbacks = cursor.fetchall()
        
        if feedbacks:
            for feedback in feedbacks:
                with st.expander(f"{feedback[0]} - 评分: {feedback[2]}/5 - {feedback[3]}"):
                    st.write(feedback[1])
        else:
            st.info("暂无用户反馈")

if __name__ == "__main__":
    main() 