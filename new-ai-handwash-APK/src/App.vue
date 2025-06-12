<template>
  <!-- <nav>
    <router-link to="/hands">hands</router-link>
  </nav> -->
  <router-view></router-view>
  
  <!-- 仅使用专业版Socket监控器 -->
  <div class="monitor-container" v-if="showMonitor && !isExcludedPage">
    <socket-monitor-pro @close="showMonitor = false" :show="true" />
  </div>
  
  <!-- 临时显示调试信息 -->
  <div class="debug-info" v-if="showMonitor && !isExcludedPage">
    监控器已打开
  </div>
  
  <!-- 仅在非排除页面显示监控按钮 -->
  <div class="monitor-controls" v-if="!isExcludedPage">
    <button 
      class="monitor-toggle"
      @click="toggleMonitor"
    >
      🔌
    </button>
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { initializeSocket, safeDisconnect } from "./services/socketAdapter";
import SocketMonitorPro from "@/components/SocketMonitorPro.vue";

const t = useI18n();
const route = useRoute();

// 是否为开发环境 - 不再使用此变量控制显示
const isDev = import.meta.env 
  ? import.meta.env.MODE !== 'production' 
  : process.env.NODE_ENV !== 'production';

// 是否显示Socket监控器
const showMonitor = ref(false);

// 定义需要排除socket监控的页面路径
const excludedPages = [
  // 目前没有需要排除的页面，所有页面都允许socket监控
];

// 检查当前页面是否在排除列表中
const isExcludedPage = computed(() => {
  return excludedPages.some(path => route.path.startsWith(path));
});

// 切换监控器显示
function toggleMonitor() {
  console.log("切换Socket监控器显示");
  showMonitor.value = !showMonitor.value;
}

// 全局初始化Socket连接
onMounted(() => {
  console.log("🔌 初始化全局Socket连接");
  initializeSocket();
  
  // 检查URL参数，如果有debug=monitor参数自动显示监控器
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  // 可选择性地自动显示监控器
  if (debugParam === 'monitor' && !isExcludedPage.value) {
    showMonitor.value = true;
  }
  
  // 防止MediaPipe错误
  window.addEventListener('error', (event) => {
    // 忽略特定的MediaPipe错误
    if (event.error && event.error.message && 
        event.error.message.includes('Cannot pass deleted object')) {
      console.warn('已捕获MediaPipe错误，这通常是正常的组件卸载行为');
      event.preventDefault();
    }
  });
});

// 应用退出前清理资源
onBeforeUnmount(() => {
  console.log("🧹 清理全局Socket资源");
  safeDisconnect();
});

detectWebsiteLanguage();
function detectWebsiteLanguage() {
  const targetLanguage = (
    localStorage.getItem("websiteLanguage") || navigator.language
  ).toLowerCase();

  // Get 'en' from 'en-US' etc
  const targetLanguageShortForm = targetLanguage.slice(0, 1);

  const availableLanguage = t.availableLocales;

  // Check if target language in available languages list
  const targetLanguageIndex = availableLanguage.indexOf(
    targetLanguage.toLowerCase()
  );
  if (targetLanguageIndex !== -1) {
    // t.locale.value = targetLanguage;
    t.locale.value = "en";
  } else {
    switch (targetLanguageShortForm) {
      case "en":
        t.locale.value = targetLanguageShortForm;
        break;
      case "zh":
        t.locale.value = "zh-cn";
        break;
      default:
        t.locale.value = "en";
    }
  }
}
</script>
<style>
/* 全局样式 */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  position: relative;
  box-sizing: border-box;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f8ff;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

/* 确保子元素不溢出容器 */
img, video, canvas {
  max-width: 100%;
  height: auto;
}

/* 监控器控件 */
.monitor-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  z-index: 9998;
}

.monitor-toggle {
  width: 40px;
  height: 40px;
  background: #4a5c79;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.monitor-toggle:hover {
  background: #0f387c;
  transform: scale(1.05);
}

.monitor-toggle:active {
  transform: scale(0.95);
}

.debug-info {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 9999;
}

/* 适配移动设备 */
@media (max-width: 768px) {
  .monitor-toggle {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .monitor-controls {
    bottom: 15px;
    right: 15px;
  }
}

@media (max-width: 480px) {
  .monitor-toggle {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .monitor-controls {
    bottom: 10px;
    right: 10px;
  }
}
</style>

