#!/bin/bash

# HandHygiene Linux原生部署脚本
# 支持Ubuntu/Debian/CentOS/RHEL系统
# 自动安装依赖、配置服务、设置开机自启动

set -e

echo "=========================================="
echo "HandHygiene Linux原生部署工具"
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
        log_error "此脚本需要root权限运行，请使用 sudo ./deploy-linux-native.sh"
        exit 1
    fi
}

# 安装基础依赖
install_base_dependencies() {
    log_info "安装基础依赖..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt update
        apt install -y curl wget git build-essential python3 python3-pip python3-venv nodejs npm nginx sqlite3 supervisor
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        yum update -y
        yum install -y curl wget git gcc gcc-c++ make python3 python3-pip nodejs npm nginx sqlite supervisor
        # 安装Node.js 18+
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        log_error "不支持的操作系统: $OS"
        exit 1
    fi
    
    log_success "基础依赖安装完成"
}

# 创建应用用户
create_app_user() {
    log_info "创建应用用户..."
    
    if ! id "handhygiene" &>/dev/null; then
        useradd -r -s /bin/bash -d /opt/handhygiene -m handhygiene
        log_success "用户 handhygiene 创建成功"
    else
        log_info "用户 handhygiene 已存在"
    fi
}

# 设置应用目录
setup_app_directory() {
    log_info "设置应用目录..."
    
    APP_DIR="/opt/handhygiene"
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
    
    chown -R handhygiene:handhygiene $APP_DIR
    log_success "应用目录设置完成"
}

# 安装Node.js依赖
install_nodejs_dependencies() {
    log_info "安装Node.js依赖..."
    
    # 后端依赖
    cd $APP_DIR/backend
    sudo -u handhygiene npm install --production
    
    # 前端依赖和构建
    cd $APP_DIR/frontend
    sudo -u handhygiene npm install
    sudo -u handhygiene npm run build
    
    log_success "Node.js依赖安装完成"
}

# 安装Python依赖
install_python_dependencies() {
    log_info "安装Python依赖..."
    
    cd $APP_DIR/ai
    
    # 创建虚拟环境
    sudo -u handhygiene python3 -m venv venv
    
    # 安装依赖
    sudo -u handhygiene ./venv/bin/pip install --upgrade pip
    sudo -u handhygiene ./venv/bin/pip install -r requirements.txt
    
    log_success "Python依赖安装完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    cat > /etc/nginx/sites-available/handhygiene << 'EOF'
server {
    listen 8081;
    server_name _;
    
    root /opt/handhygiene/frontend/dist;
    index index.html;
    
    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # API代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    cat > /etc/systemd/system/handhygiene-backend.service << 'EOF'
[Unit]
Description=HandHygiene Backend Service
After=network.target

[Service]
Type=simple
User=handhygiene
Group=handhygiene
WorkingDirectory=/opt/handhygiene/backend
Environment=NODE_ENV=production
Environment=DB_PATH=/opt/handhygiene/data/data.db
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
    cat > /etc/systemd/system/handhygiene-ai.service << 'EOF'
[Unit]
Description=HandHygiene AI Service
After=network.target

[Service]
Type=simple
User=handhygiene
Group=handhygiene
WorkingDirectory=/opt/handhygiene/ai
Environment=PYTHONPATH=/opt/handhygiene/ai
ExecStart=/opt/handhygiene/ai/venv/bin/python kaggle_get_one_prediction.py
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

# 创建管理脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    # 服务状态检查脚本
    cat > /usr/local/bin/handhygiene-status << 'EOF'
#!/bin/bash
echo "HandHygiene 服务状态:"
echo "===================="
echo "后端服务:"
systemctl status handhygiene-backend --no-pager -l
echo ""
echo "AI服务:"
systemctl status handhygiene-ai --no-pager -l
echo ""
echo "Nginx服务:"
systemctl status nginx --no-pager -l
echo ""
echo "端口监听状态:"
netstat -tlnp | grep -E ':(3001|8081|9501)'
EOF

    # 服务重启脚本
    cat > /usr/local/bin/handhygiene-restart << 'EOF'
#!/bin/bash
echo "重启HandHygiene服务..."
systemctl restart handhygiene-backend
systemctl restart handhygiene-ai
systemctl restart nginx
echo "服务重启完成"
EOF

    # 日志查看脚本
    cat > /usr/local/bin/handhygiene-logs << 'EOF'
#!/bin/bash
case "$1" in
    backend)
        journalctl -u handhygiene-backend -f
        ;;
    ai)
        journalctl -u handhygiene-ai -f
        ;;
    nginx)
        journalctl -u nginx -f
        ;;
    all)
        journalctl -u handhygiene-backend -u handhygiene-ai -u nginx -f
        ;;
    *)
        echo "用法: handhygiene-logs [backend|ai|nginx|all]"
        ;;
esac
EOF

    chmod +x /usr/local/bin/handhygiene-*
    
    log_success "管理脚本创建完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian
        ufw allow 8081/tcp
        ufw allow 3001/tcp
        ufw allow 9501/tcp
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL
        firewall-cmd --permanent --add-port=8081/tcp
        firewall-cmd --permanent --add-port=3001/tcp
        firewall-cmd --permanent --add-port=9501/tcp
        firewall-cmd --reload
    fi
    
    log_success "防火墙配置完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    sleep 5
    
    # 检查服务状态
    if systemctl is-active --quiet handhygiene-backend; then
        log_success "后端服务运行正常"
    else
        log_error "后端服务启动失败"
    fi
    
    if systemctl is-active --quiet handhygiene-ai; then
        log_success "AI服务运行正常"
    else
        log_error "AI服务启动失败"
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx服务运行正常"
    else
        log_error "Nginx服务启动失败"
    fi
    
    # 检查端口
    if netstat -tlnp | grep -q ":8081"; then
        log_success "前端端口8081监听正常"
    else
        log_warning "前端端口8081未监听"
    fi
    
    if netstat -tlnp | grep -q ":3001"; then
        log_success "后端端口3001监听正常"
    else
        log_warning "后端端口3001未监听"
    fi
    
    if netstat -tlnp | grep -q ":9501"; then
        log_success "AI服务端口9501监听正常"
    else
        log_warning "AI服务端口9501未监听"
    fi
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
    echo "管理命令:"
    echo "  查看状态: handhygiene-status"
    echo "  重启服务: handhygiene-restart"
    echo "  查看日志: handhygiene-logs [backend|ai|nginx|all]"
    echo ""
    echo "服务文件位置:"
    echo "  应用目录: /opt/handhygiene"
    echo "  数据目录: /opt/handhygiene/data"
    echo "  日志目录: /opt/handhygiene/logs"
    echo ""
    echo "systemd服务:"
    echo "  handhygiene-backend.service"
    echo "  handhygiene-ai.service"
    echo "  nginx.service"
    echo ""
    log_info "所有服务已设置为开机自启动"
}

# 主函数
main() {
    check_root
    detect_os
    install_base_dependencies
    create_app_user
    setup_app_directory
    install_nodejs_dependencies
    install_python_dependencies
    configure_nginx
    create_systemd_services
    start_services
    create_management_scripts
    configure_firewall
    verify_deployment
    show_deployment_info
}

# 执行主函数
main "$@" 