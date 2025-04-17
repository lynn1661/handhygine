<template>
  <!-- <nav>
    <router-link to="/hands">hands</router-link>
  </nav> -->
  <router-view></router-view>
  
  <!-- 添加Socket监控器，仅在开发环境显示 -->
  <socket-monitor v-if="isDev && showMonitor" @close="showMonitor = false" />
  
  <!-- 在右下角添加一个小按钮用于显示/隐藏监控器 -->
  <button 
    v-if="isDev" 
    class="monitor-toggle"
    @click="showMonitor = !showMonitor"
  >
    🔌
  </button>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { initializeSocket, safeDisconnect } from "./services/socketAdapter";
import SocketMonitor from "@/components/SocketMonitor.vue";

const t = useI18n();

// 是否为开发环境
const isDev = import.meta.env 
  ? import.meta.env.MODE !== 'production' 
  : process.env.NODE_ENV !== 'production';
// 是否显示Socket监控器
const showMonitor = ref(false);

// 全局初始化Socket连接
onMounted(() => {
  console.log("🔌 初始化全局Socket连接");
  initializeSocket();
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
.monitor-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
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
  z-index: 9998;
}

.monitor-toggle:hover {
  background: #0f387c;
}
</style>
