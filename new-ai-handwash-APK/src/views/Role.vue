<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：简化版 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="top-actions">
          <el-button @click="switchToAuditingMode" class="auditing-mode-button">
            Switch to Auditing Mode
          </el-button>
        <div class="back-btn" @click="backHome">
          <img src="../assets/home.png" alt="返回首页" />
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-section">
        <!-- 角色选择区域 -->
        <div class="role-selection">
          <div class="role-buttons">
            <button @click="selectRole('Doctor')" class="role-button doctor-btn">
              {{ $t("HandHygiene.role1") }}
            </button>
            <button @click="selectRole('Nurse')" class="role-button nurse-btn">
              {{ $t("HandHygiene.role2") }}
            </button>
            <button @click="selectRole('Allied Health')" class="role-button allied-btn">
              {{ $t("HandHygiene.role3") }}
            </button>
            <button @click="selectRole('Other')" class="role-button other-btn">
              {{ $t("HandHygiene.role4") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElNotification } from "element-plus";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { onMounted, onUnmounted } from 'vue';

const store = useStore();
const router = useRouter();
const t = useI18n();

async function selectRole(role) {
  try {
    const res = await store.dispatch("user/updateRole", { 
      role: role, 
    });
    // 存储会话ID供后续使用
    localStorage.setItem("sessionID", res.ID);
    sessionStorage.setItem("sessionID", res.ID);
    router.push({
      path: "/detecting",
    });
  } catch (error) {
    console.error("Failed to create training session:", error);
    ElNotification({
      title: "Error",
      message: "Failed to start training session. Please try again.",
      type: "error"
    });
  }
};

const backHome = () => {
  // 清理视频数据
  store.commit("user/clearVideoBlob");
  // 返回首页
  router.push({
    path: "/",
  });
};

const switchToAuditingMode = () => {
  window.location.href = "http://localhost:8080";
};

let inactivityTimer = null;
/*
const resetTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    router.push({ path: '/' });
  }, 120000); // 2 分钟 = 120000 毫秒
};

onMounted(() => {
  // 监听常见用户操作，重置计时器
  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('mousedown', resetTimer);
  window.addEventListener('touchstart', resetTimer);
  window.addEventListener('keydown', resetTimer);

  // 初始化计时器
  resetTimer();
});

onUnmounted(() => {
  window.removeEventListener('mousemove', resetTimer);
  window.removeEventListener('mousedown', resetTimer);
  window.removeEventListener('touchstart', resetTimer);
  window.removeEventListener('keydown', resetTimer);
  clearTimeout(inactivityTimer);
});*/
</script>

<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/bg.png"); /* 保持原有背景 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  box-sizing: border-box;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  min-height: 90vh;
  position: relative;
  padding: 0.5rem;
}

/* 顶部区域样式 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  width: 100%;
  margin-top: 1.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-image {
  width: auto;
  height: 3.5rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 2.5rem;
  }
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auditing-mode-button {
  background-color: #409EFF;
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #66B1FF;
  }
}

.back-btn {
  width: 4.5rem;
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
  
  img {
    width: 100%;
    height: 100%;
  }
  
  @media (max-width: 480px) {
    width: 3.5rem;
    height: 3.5rem;
  }
}

/* 主要内容区域 - 居中显示 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
}

/* 角色选择区域 */
.role-selection {
  width: 100%;
  max-width: 650px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.role-title {
  text-align: center;
  margin-bottom: 1rem;
  
  h2 {
    font-family: "Helvetica85", sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: #0f387c;
    margin: 0;
    text-shadow: 0 2px 4px rgba(15, 56, 124, 0.2);
    letter-spacing: 1px;
    
    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.6rem;
    }
  }
}

.role-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.role-button {
  width: 100%;
  height: 100px;
  background-size: cover;
  background-position: center;
  border-radius: 20px;
  border: none;
  color: white;
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0));
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    
    &::before {
      transform: translateX(100%);
    }
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
}

.doctor-btn,
.nurse-btn,
.allied-btn,
.other-btn {
  background-image: url(../assets/button.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 响应式布局调整 */
@media (max-width: 768px) {
  .role-buttons {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  .role-button {
    height: 85px;
    font-size: 1.3rem;
  }
  
  .main-section {
    padding: 1.5rem 0;
  }
}

@media (max-width: 480px) {
  .role-buttons {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .role-button {
    height: 80px;
    font-size: 1.2rem;
  }
  
  .role-selection {
    gap: 1.5rem;
  }
}

@media (max-height: 700px) {
  .role-button {
    height: 85px;
    font-size: 1.3rem;
  }
  
  .main-section {
    padding: 1rem 0;
  }
  
  .role-selection {
    gap: 1.5rem;
  }
}
</style>
