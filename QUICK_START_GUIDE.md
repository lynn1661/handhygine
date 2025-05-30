# 🚀 手部卫生检测系统 - 快速开始指南

## 📋 系统概述

这是一个完整的Python手部卫生检测系统，已从Vue.js完全迁移到Python技术栈，提供：
- ✅ 实时手部检测
- ✅ 用户认证系统  
- ✅ 数据可视化
- ✅ 排行榜功能
- ✅ 管理员面板

## 🏃‍♂️ 快速启动

### 1. 确认环境
```bash
cd ai-handwash-assist-server-main
source venv39/bin/activate
python --version  # 应显示 Python 3.9.18
```

### 2. 一键启动
```bash
./start_python_app.sh
```

### 3. 访问系统
- **前端应用**: http://localhost:8501
- **后端API**: http://localhost:5000

## 👤 测试账号

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`
- 功能: 完整管理权限

### 普通用户
可以直接注册新账号，或使用：
- 用户名: `user`  
- 密码: `user123`

## 🎯 主要功能

### 1. 用户功能
- 📝 注册/登录
- 📹 实时手部检测
- 📊 个人数据统计
- 🏆 查看排行榜
- 💬 提交反馈

### 2. 管理员功能
- 👥 用户管理
- 📈 系统统计
- 💬 反馈管理
- 📊 数据分析

## 🔧 开发指南

### 核心文件
- `streamlit_app_complete.py` - 主前端应用
- `app.py` - Flask后端服务
- `services/` - 业务逻辑层
- `processor/` - AI模型处理
- `net/` - 神经网络模型

### 启动方式
```bash
# 方法1: 使用启动脚本（推荐）
./start_python_app.sh

# 方法2: 手动启动
# 终端1: 启动后端
python app.py

# 终端2: 启动前端  
streamlit run streamlit_app_complete.py
```

## 🐛 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口使用情况
   lsof -i :5000  # Flask后端
   lsof -i :8501  # Streamlit前端
   
   # 杀死占用进程
   kill -9 <PID>
   ```

2. **依赖缺失**
   ```bash
   pip install -r requirements.txt
   ```

3. **虚拟环境问题**
   ```bash
   source venv39/bin/activate
   ```

4. **数据库问题**
   ```bash
   # 删除数据库重新初始化
   rm handwash_app.db
   # 重启应用会自动创建新数据库
   ```

## 📁 文件结构

```
ai-handwash-assist-server-main/
├── streamlit_app_complete.py    # ⭐ 主前端应用
├── app.py                      # ⭐ Flask后端
├── requirements.txt            # ⭐ Python依赖
├── start_python_app.sh         # ⭐ 启动脚本
├── services/                   # 业务服务层
├── processor/                  # AI数据处理
├── net/                        # 神经网络模型
├── feeder/                     # 数据加载器
├── checkpoints/                # 模型权重
└── venv39/                     # Python环境
```

## 🎉 成功启动的标志

看到以下信息表示启动成功：

```
✅ Flask后端启动成功
🌐 前端地址: http://localhost:8501
🌐 后端地址: http://localhost:5000

📱 使用说明:
1. 在浏览器中访问 http://localhost:8501
2. 注册新账号或使用测试账号登录
3. 选择'手部检测'功能开始使用
```

## 📞 支持

如遇问题，请查看：
- `FILE_ORGANIZATION_ANALYSIS.md` - 文件组织说明
- `PROJECT_CLEANUP_REPORT.md` - 清理报告
- `VUEJS_TO_PYTHON_MIGRATION_GUIDE.md` - 完整迁移指南

---

🎯 **立即开始**: 运行 `./start_python_app.sh`，然后访问 http://localhost:8501 