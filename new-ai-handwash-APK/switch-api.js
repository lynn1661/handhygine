#!/usr/bin/env node
/**
 * API切换脚本 - 在Socket.IO和HTTP API之间快速切换
 * 使用方法：node switch-api.js [http|socket]
 */

const fs = require('fs');
const path = require('path');

const HANDS_VUE_PATH = './src/views/Hands.vue';
const SOCKET_MONITOR_PATH = './src/components/SocketMonitorPro.vue';

// API配置
const API_CONFIGS = {
  http: {
    name: 'HTTP REST API (Flask)',
    imports: {
      hands: `import { createConnect, disconnect, sendLog } from "../services/apiAdapter";`,
      monitor: `import { createConnect, createConnectWithRetryWrapper } from "../services/apiAdapter";`
    }
  },
  socket: {
    name: 'Socket.IO (原版)',
    imports: {
      hands: `import { createConnect, disconnect, sendLog } from "../services/socket";`,
      monitor: `import { createConnect, createConnectWithRetryWrapper } from "../services/socketAdapter";`
    }
  }
};

function updateImports(filePath, newImport, description) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 查找并替换import语句
    const importPattern = /import\s+{[^}]+}\s+from\s+["'][^"']*\/services\/(socket|apiAdapter|socketAdapter)["'];?/g;
    
    if (importPattern.test(content)) {
      content = content.replace(importPattern, newImport);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 更新成功: ${description}`);
      return true;
    } else {
      console.warn(`⚠️  未找到匹配的import语句: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 更新失败: ${filePath}`, error.message);
    return false;
  }
}

function switchAPI(mode) {
  const config = API_CONFIGS[mode];
  
  if (!config) {
    console.error('❌ 无效的模式，请使用 http 或 socket');
    process.exit(1);
  }

  console.log(`🔄 切换到: ${config.name}`);
  console.log('==========================================');

  // 更新各个文件
  const updates = [
    {
      file: HANDS_VUE_PATH,
      import: config.imports.hands,
      desc: 'Hands.vue (主要页面)'
    },
    {
      file: SOCKET_MONITOR_PATH,
      import: config.imports.monitor,
      desc: 'SocketMonitorPro.vue (监控组件)'
    }
  ];

  let successCount = 0;
  updates.forEach(update => {
    if (updateImports(update.file, update.import, update.desc)) {
      successCount++;
    }
  });

  console.log('==========================================');
  console.log(`📊 更新结果: ${successCount}/${updates.length} 个文件更新成功`);

  if (successCount === updates.length) {
    console.log(`🎉 切换完成！现在使用: ${config.name}`);
    
    if (mode === 'http') {
      console.log('\n📋 下一步操作:');
      console.log('1. 启动Flask服务器: cd ../ai-handwash-assist-server-main && ./start_server.sh');
      console.log('2. 启动Vue开发服务器: npm run dev');
      console.log('3. 访问: http://localhost:5173');
    } else {
      console.log('\n📋 下一步操作:');
      console.log('1. 确保Socket.IO服务器正在运行');
      console.log('2. 启动Vue开发服务器: npm run dev');
      console.log('3. 检查Socket连接状态');
    }
  } else {
    console.log('⚠️  部分文件更新失败，请手动检查');
  }
}

function showUsage() {
  console.log('🛠️  API切换工具');
  console.log('================');
  console.log('使用方法: node switch-api.js [模式]');
  console.log('');
  console.log('可用模式:');
  console.log('  http   - 切换到HTTP REST API (Flask后端)');
  console.log('  socket - 切换到Socket.IO (原版后端)');
  console.log('');
  console.log('示例:');
  console.log('  node switch-api.js http     # 切换到Flask HTTP API');
  console.log('  node switch-api.js socket   # 切换到Socket.IO');
}

function checkCurrentMode() {
  console.log('🔍 检查当前API模式...');
  
  if (fs.existsSync(HANDS_VUE_PATH)) {
    const content = fs.readFileSync(HANDS_VUE_PATH, 'utf8');
    
    if (content.includes('apiAdapter')) {
      console.log('📡 当前模式: HTTP REST API (Flask)');
    } else if (content.includes('"../services/socket"')) {
      console.log('📡 当前模式: Socket.IO (原版)');
    } else {
      console.log('❓ 无法确定当前模式');
    }
  }
}

// 主程序
const args = process.argv.slice(2);
const mode = args[0];

if (!mode || mode === '--help' || mode === '-h') {
  showUsage();
  process.exit(0);
}

if (mode === '--status' || mode === '-s') {
  checkCurrentMode();
  process.exit(0);
}

if (!['http', 'socket'].includes(mode)) {
  console.error('❌ 无效的模式，请使用 http 或 socket');
  showUsage();
  process.exit(1);
}

// 显示当前模式
checkCurrentMode();
console.log('');

// 执行切换
switchAPI(mode); 