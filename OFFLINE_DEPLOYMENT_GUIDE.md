# 离线部署指南

本指南将帮助您在没有互联网连接的环境中部署和运行洗手检测应用。

## 前置条件

### 必需软件安装

1. **Node.js** (版本 18 或更高)
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version`

2. **MongoDB** (版本 5.0 或更高)
   - 下载地址：https://www.mongodb.com/try/download/community
   - 验证安装：`mongod --version`

3. **Git** (用于代码管理)
   - 下载地址：https://git-scm.com/
   - 验证安装：`git --version`

## 部署步骤

### 1. 启动本地MongoDB数据库

```bash
# 创建数据目录
mkdir -p ~/mongodb/data

# 启动MongoDB服务（Windows）
mongod --dbpath ~/mongodb/data

# 或者在Linux/macOS中
mongod --dbpath ~/mongodb/data --bind_ip 127.0.0.1
```

### 2. 初始化数据库

```bash
# 进入服务端目录
cd ai-handwash-assist-server-main

# 安装依赖
npm install

# 运行数据库初始化脚本
node scripts/init-db.js
```

### 3. 启动后端服务

```bash
# 在 ai-handwash-assist-server-main 目录中
npm start
```

服务器将在 http://localhost:3000 启动

### 4. 启动前端应用

```bash
# 进入前端目录
cd new-ai-handwash-APK

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:5173 启动

## MediaPipe 资源验证

### 必需文件列表

确认MediaPipe资源已正确下载到 `new-ai-handwash-APK/public/mediapipe/` 目录：

```
new-ai-handwash-APK/public/mediapipe/
├── hands.js                                    (45.5 KB)  - 核心库文件
├── hands.wasm                                 (5.9 MB)   - WebAssembly 模块
├── hands.binarypb                             (550 B)    - 配置文件
├── hands_solution_packed_assets.binarypb      (550 B)    - 打包资源配置
├── hands_solution_packed_assets.data          (4.3 MB)   - 打包资源数据
├── hands_solution_packed_assets_loader.js     (8.3 KB)   - 资源加载器
├── hands_solution_simd_wasm_bin.js            (270 KB)   - SIMD WebAssembly 脚本
├── hands_solution_simd_wasm_bin.wasm          (5.8 MB)   - SIMD WebAssembly 模块
├── hands_solution_wasm_bin.js                 (270 KB)   - 标准 WebAssembly 脚本
├── hands_solution_wasm_bin.wasm               (5.6 MB)   - 标准 WebAssembly 模块
├── hand_landmark_full.tflite                  (5.3 MB)   - 完整手部模型
└── hand_landmark_lite.tflite                  (2.0 MB)   - 轻量级手部模型
```

### 验证文件完整性

1. **检查文件大小**：
   ```bash
   cd new-ai-handwash-APK/public/mediapipe
   ls -la
   ```

2. **验证核心文件可访问性**：
   访问 `http://localhost:5173/mediapipe/index.html` 查看文件验证页面

3. **手动验证**：
   ```bash
   # 测试核心文件是否可访问
   curl -I http://localhost:5173/mediapipe/hands.js
   curl -I http://localhost:5173/mediapipe/hands.wasm
   curl -I http://localhost:5173/mediapipe/hands.binarypb
   ```

### 常见问题解决

如果MediaPipe文件加载失败，请按以下步骤重新下载：

```bash
cd new-ai-handwash-APK/public/mediapipe

# 下载核心文件
curl -o hands.js https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js
curl -o hands.binarypb https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.binarypb

# 下载WebAssembly文件
curl -o hands_solution_wasm_bin.wasm https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_wasm_bin.wasm
curl -o hands_solution_simd_wasm_bin.wasm https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_simd_wasm_bin.wasm

# 创建缺失的文件（如果不存在）
cp hands_solution_wasm_bin.wasm hands.wasm
cp hands.binarypb hands_solution_packed_assets.binarypb

# 下载模型文件
curl -o hand_landmark_full.tflite https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hand_landmark_full.tflite
curl -o hand_landmark_lite.tflite https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hand_landmark_lite.tflite

# 下载其他支持文件
curl -o hands_solution_packed_assets.data https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_packed_assets.data
curl -o hands_solution_packed_assets_loader.js https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_packed_assets_loader.js
curl -o hands_solution_wasm_bin.js https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_wasm_bin.js
curl -o hands_solution_simd_wasm_bin.js https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_simd_wasm_bin.js
```

## 生产环境部署

### 构建前端应用

```bash
cd new-ai-handwash-APK
npm run build
```

生成的文件在 `dist/` 目录中。

### 使用静态文件服务器

使用任何静态文件服务器托管构建的文件，例如：

```bash
# 使用Node.js serve包
npm install -g serve
serve -s dist -p 8080
```

### 配置反向代理（可选）

如果需要将前端和后端部署在同一域下，可以使用Nginx配置反向代理：

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 故障排除

### 常见问题

1. **MediaPipe 加载失败**
   - 确认MediaPipe文件在正确路径
   - 检查控制台是否有文件加载错误
   - 验证文件大小是否正确（见上面的文件列表）
   - 访问验证页面检查文件状态

2. **数据库连接失败**
   - 确认MongoDB服务正在运行
   - 检查端口27017是否被占用

3. **摄像头访问被拒绝**
   - 确保使用HTTPS或localhost访问
   - 检查浏览器摄像头权限设置

4. **Socket连接失败**
   - 确认后端服务正在运行
   - 检查防火墙设置

### 性能优化

1. **减少MediaPipe模型复杂度**
   ```javascript
   // 在Hands.vue中调整
   modelComplexity: 0, // 使用轻量级模型
   minDetectionConfidence: 0.7,
   minTrackingConfidence: 0.6
   ```

2. **降低视频分辨率**
   ```javascript
   // 调整摄像头配置
   const constraints = {
     video: {
       width: { ideal: 640 },
       height: { ideal: 480 },
       frameRate: { ideal: 15 }
     }
   };
   ```

## 数据备份

定期备份MongoDB数据：

```bash
# 导出数据
mongodump --db Polyuhandhygiene --out backup/

# 恢复数据
mongorestore --db Polyuhandhygiene backup/Polyuhandhygiene/
```

## 安全建议

1. 更改默认数据库密码
2. 启用MongoDB身份验证
3. 配置防火墙规则
4. 定期更新依赖包

## 技术支持

如遇到问题，请检查：
1. 浏览器控制台错误信息
2. 服务器日志
3. MongoDB日志
4. 网络连接状态
5. MediaPipe文件验证页面状态

---

更多详细信息请参考项目文档或联系技术支持团队。 