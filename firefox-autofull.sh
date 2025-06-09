#!/usr/bin/env bash
#
# 脚本：自动打开 Firefox 并进入全屏
#
URL="file:///home/edge/Desktop/index.html"

# 1. 以正常模式启动 Firefox（不加 --kiosk），后台运行
/usr/bin/firefox "$URL" &

# 2. 等待几秒，确保 Firefox 窗口已创建并可见
sleep 3

# 3. 找到第一个可见的 Firefox 窗口 ID
WINDOW_ID=$(xdotool search --onlyvisible --class "firefox" | head -n 1)

# 4. 如果找到了，就激活该窗口并发送一次 F11
if [ -n "$WINDOW_ID" ]; then
  xdotool windowactivate --sync "$WINDOW_ID"
  xdotool key --window "$WINDOW_ID" F11
fi