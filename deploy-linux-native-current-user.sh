#!/bin/bash

# HandHygiene Linux原生部署脚本 - 当前用户版本
# 使用当前用户运行服务（不推荐用于生产环境）

set -e

echo "=========================================="
echo "HandHygiene Linux原生部署工具 (当前用户版本)"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 安全警告
show_security_warning() {
    echo ""
    log_warning "⚠️  安全警告 ⚠️"
    echo "此版本将使用当前用户 $(whoami) 运行所有服务"
    echo "这在生产环境中不推荐，因为："
    echo "  1. 缺乏权限隔离"
    echo "  2. 安全风险较高"
    echo "  3. 不符合Linux服务最佳实践"
    echo ""
    read -p "确认要继续吗？(输入 'YES' 确认): " confirm
    
    if [ "$confirm" != "YES" ]; then
        log_info "取消部署，建议使用标准版本 deploy-linux-native.sh"
        exit 0
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        log_error "无法检测操作系统类型"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行，请使用 sudo ./deploy-linux-native-current-user.sh"
        exit 1
    fi
}

# 获取当前用户信息
get_current_user() {
    CURRENT_USER=$(logname 2>/dev/null || echo $SUDO_USER)
    CURRENT_HOME=$(eval echo ~$CURRENT_USER)
    
    if [ -z "$CURRENT_USER" ]; then
        log_error "无法确定当前用户"
        exit 1
    fi
    
    log_info "将使用用户: $CURRENT_USER"
    log_info "用户主目录: $CURRENT_HOME"
}

# 安装基础依赖
install_base_dependencies() {
    log_info "安装基础依赖..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt update
        apt install -y curl wget git build-essential python3 python3-pip python3-venv nodejs npm nginx sqlite3
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        yum update -y
        yum install -y curl wget git gcc gcc-c++ make python3 python3-pip nodejs npm nginx sqlite
        # 安装Node.js 18+
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        log_error "不支持的操作系统: $OS"
        exit 1
    fi
    
    log_success "基础依赖安装完成"
}

# 设置应用目录
setup_app_directory() {
    log_info "设置应用目录..."
    
    APP_DIR="$CURRENT_HOME/handhygiene"
    mkdir -p $APP_DIR/{frontend,backend,ai,data,logs}
    
    # 复制项目文件
    cp -r new-ai-handwash-APK/* $APP_DIR/frontend/
    cp -r ai-handwash-assist-server-main/* $APP_DIR/backend/
    cp -r new-ai-handwash-server/* $APP_DIR/ai/
    
    # 创建数据目录
    mkdir -p $APP_DIR/data
    if [ -f ai-handwash-assist-server-main/data.db ]; then
        cp ai-handwash-assist-server-main/data.db $APP_DIR/data/
    fi
    
    chown -R $CURRENT_USER:$CURRENT_USER $APP_DIR
    log_success "应用目录设置完成: $APP_DIR"
}

# 安装Node.js依赖
install_nodejs_dependencies() {
    log_info "安装Node.js依赖..."
    
    # 后端依赖
    cd $APP_DIR/backend
    sudo -u $CURRENT_USER npm install --production
    
    # 前端依赖和构建
    cd $APP_DIR/frontend
    sudo -u $CURRENT_USER npm install
    sudo -u $CURRENT_USER npm run build
    
    log_success "Node.js依赖安装完成"
}

# 安装Python依赖
install_python_dependencies() {
    log_info "安装Python依赖..."
    
    cd $APP_DIR/ai
    
    # 创建虚拟环境
    sudo -u $CURRENT_USER python3 -m venv venv
    
    # 安装依赖
    sudo -u $CURRENT_USER ./venv/bin/pip install --upgrade pip
    sudo -u $CURRENT_USER ./venv/bin/pip install -r requirements.txt
    
    log_success "Python依赖安装完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    cat > /etc/nginx/sites-available/handhygiene << EOF
server {
    listen 8081;
    server_name _;
    
    root $APP_DIR/frontend/dist;
    index index.html;
    
    # 前端静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # API代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # 启用站点
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        ln -sf /etc/nginx/sites-available/handhygiene /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    else
        # CentOS/RHEL
        cp /etc/nginx/sites-available/handhygiene /etc/nginx/conf.d/handhygiene.conf
    fi
    
    # 测试配置
    nginx -t
    
    log_success "Nginx配置完成"
}

# 创建systemd服务文件
create_systemd_services() {
    log_info "创建systemd服务..."
    
    # 后端服务
    cat > /etc/systemd/system/handhygiene-backend.service << EOF
[Unit]
Description=HandHygiene Backend Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
Environment=DB_PATH=$APP_DIR/data/data.db
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=handhygiene-backend

[Install]
WantedBy=multi-user.target
EOF

    # AI服务
    cat > /etc/systemd/system/handhygiene-ai.service << EOF
[Unit]
Description=HandHygiene AI Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$APP_DIR/ai
Environment=PYTHONPATH=$APP_DIR/ai
ExecStart=$APP_DIR/ai/venv/bin/python kaggle_get_one_prediction.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=handhygiene-ai

[Install]
WantedBy=multi-user.target
EOF
    
    log_success "systemd服务文件创建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 重新加载systemd
    systemctl daemon-reload
    
    # 启动并启用服务
    systemctl enable handhygiene-backend
    systemctl enable handhygiene-ai
    systemctl enable nginx
    
    systemctl start handhygiene-backend
    systemctl start handhygiene-ai
    systemctl start nginx
    
    log_success "所有服务已启动"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=========================================="
    log_success "HandHygiene部署完成！"
    echo "=========================================="
    echo ""
    echo "服务信息:"
    echo "  前端地址: http://$(hostname -I | awk '{print $1}'):8081"
    echo "  后端API: http://$(hostname -I | awk '{print $1}'):3001"
    echo "  AI服务:  http://$(hostname -I | awk '{print $1}'):9501"
    echo ""
    echo "服务文件位置:"
    echo "  应用目录: $APP_DIR"
    echo "  数据目录: $APP_DIR/data"
    echo "  日志目录: $APP_DIR/logs"
    echo ""
    echo "运行用户: $CURRENT_USER"
    echo ""
    log_warning "注意：此部署使用普通用户运行服务，安全性较低"
    log_info "生产环境建议使用 deploy-linux-native.sh"
}

# 主函数
main() {
    show_security_warning
    check_root
    get_current_user
    detect_os
    install_base_dependencies
    setup_app_directory
    install_nodejs_dependencies
    install_python_dependencies
    configure_nginx
    create_systemd_services
    start_services
    show_deployment_info
}

# 执行主函数
main "$@" 