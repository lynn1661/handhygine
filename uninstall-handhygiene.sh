#!/bin/bash

# HandHygiene Linux原生部署卸载脚本

set -e

echo "=========================================="
echo "HandHygiene 卸载工具"
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

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行，请使用 sudo ./uninstall-handhygiene.sh"
        exit 1
    fi
}

# 确认卸载
confirm_uninstall() {
    echo ""
    log_warning "此操作将完全删除HandHygiene及其所有数据！"
    echo ""
    read -p "确认要继续吗？(输入 'YES' 确认): " confirm
    
    if [ "$confirm" != "YES" ]; then
        log_info "取消卸载"
        exit 0
    fi
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    systemctl stop handhygiene-backend 2>/dev/null || true
    systemctl stop handhygiene-ai 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    log_success "服务已停止"
}

# 禁用服务
disable_services() {
    log_info "禁用服务..."
    
    systemctl disable handhygiene-backend 2>/dev/null || true
    systemctl disable handhygiene-ai 2>/dev/null || true
    
    log_success "服务已禁用"
}

# 删除systemd服务文件
remove_systemd_services() {
    log_info "删除systemd服务文件..."
    
    rm -f /etc/systemd/system/handhygiene-backend.service
    rm -f /etc/systemd/system/handhygiene-ai.service
    
    systemctl daemon-reload
    
    log_success "systemd服务文件已删除"
}

# 删除Nginx配置
remove_nginx_config() {
    log_info "删除Nginx配置..."
    
    rm -f /etc/nginx/sites-available/handhygiene
    rm -f /etc/nginx/sites-enabled/handhygiene
    rm -f /etc/nginx/conf.d/handhygiene.conf
    
    # 重启nginx或恢复默认配置
    if systemctl is-active --quiet nginx; then
        nginx -t && systemctl reload nginx
    fi
    
    log_success "Nginx配置已删除"
}

# 删除应用目录
remove_app_directory() {
    log_info "删除应用目录..."
    
    if [ -d "/opt/handhygiene" ]; then
        rm -rf /opt/handhygiene
        log_success "应用目录已删除"
    else
        log_info "应用目录不存在"
    fi
}

# 删除应用用户
remove_app_user() {
    log_info "删除应用用户..."
    
    if id "handhygiene" &>/dev/null; then
        userdel -r handhygiene 2>/dev/null || userdel handhygiene 2>/dev/null || true
        log_success "用户 handhygiene 已删除"
    else
        log_info "用户 handhygiene 不存在"
    fi
}

# 删除管理脚本
remove_management_scripts() {
    log_info "删除管理脚本..."
    
    rm -f /usr/local/bin/handhygiene-status
    rm -f /usr/local/bin/handhygiene-restart
    rm -f /usr/local/bin/handhygiene-logs
    
    log_success "管理脚本已删除"
}

# 清理防火墙规则
cleanup_firewall() {
    log_info "清理防火墙规则..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian
        ufw delete allow 8081/tcp 2>/dev/null || true
        ufw delete allow 3001/tcp 2>/dev/null || true
        ufw delete allow 9501/tcp 2>/dev/null || true
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL
        firewall-cmd --permanent --remove-port=8081/tcp 2>/dev/null || true
        firewall-cmd --permanent --remove-port=3001/tcp 2>/dev/null || true
        firewall-cmd --permanent --remove-port=9501/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
    fi
    
    log_success "防火墙规则已清理"
}

# 显示卸载完成信息
show_uninstall_info() {
    echo ""
    echo "=========================================="
    log_success "HandHygiene卸载完成！"
    echo "=========================================="
    echo ""
    log_info "以下项目已被删除："
    echo "  - HandHygiene应用目录 (/opt/handhygiene)"
    echo "  - HandHygiene用户账户"
    echo "  - systemd服务文件"
    echo "  - Nginx配置文件"
    echo "  - 管理脚本"
    echo "  - 防火墙规则"
    echo ""
    log_warning "注意：系统依赖包（Node.js, Python, Nginx等）未被删除"
    log_warning "如需删除这些包，请手动执行相应的包管理器命令"
}

# 主函数
main() {
    check_root
    confirm_uninstall
    stop_services
    disable_services
    remove_systemd_services
    remove_nginx_config
    remove_management_scripts
    cleanup_firewall
    remove_app_directory
    remove_app_user
    show_uninstall_info
}

# 执行主函数
main "$@" 