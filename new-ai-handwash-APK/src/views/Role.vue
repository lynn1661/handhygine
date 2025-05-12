<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：简化版 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="back-btn" @click="backHome">
          <img src="../assets/home.png" alt="返回首页" />
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-section">
        <!-- 用户ID输入区域 -->
        <div class="user-input-section">
          <el-input
            v-model="userID"
            :placeholder="$t('HandHygiene.userID')"
            class="user-input"
          />
        </div>

        <!-- 角色选择区域 - 移除标题 -->
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
const userID = ref("");

async function selectRole(role) {
  const accountID = localStorage.getItem("accountID");
  const res = await store.dispatch("user/updateRole", { 
    accountID: accountID,
    userID: userID.value,
    role: role, 
  });
  localStorage.setItem("accountSerialNumber", res.ID);
  sessionStorage.setItem("accountSerialNumber", res.ID);
  router.push({
    path: "/detecting",
  });
};

const backHome = () => {
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  localStorage.removeItem("accountSerialNumber");
  sessionStorage.removeItem("accountSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
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
  min-height: 95vh;
  position: relative;
  padding: 0.5rem 2rem;
}

/* 顶部区域样式 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  margin-bottom: 0.8rem;
  width: 100%;
  margin-top: 0.3rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-image {
  width: auto;
  height: 2.75rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
}

.back-btn {
  width: 3rem;
  height: 3rem;
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
    width: 2.75rem;
    height: 2.75rem;
  }
}

/* 主要内容区域 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0;
  padding-bottom: 2rem;
}

/* 用户ID输入区域 */
.user-input-section {
  width: 100%;
  max-width: 500px;
  display: flex;
  justify-content: center;
}

.user-input {
  width: 100%;
  
  :deep(.el-input__wrapper) {
    background: rgba(245, 248, 253, 0.9);
    border-radius: 30px;
    height: 60px;
    box-shadow: 0 6px 16px rgba(15, 56, 124, 0.15);
    border: 1px solid rgba(15, 56, 124, 0.1);
  }
  
  :deep(.el-input__inner) {
    font-family: "Helvetica85", sans-serif;
    font-size: 1.4rem;
    color: #0f387c;
    height: 60px;
    padding: 0 2rem;
    
    &::placeholder {
      color: #7791bc;
      opacity: 0.8;
    }
  }
}

/* 角色选择区域 */
.role-selection {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.role-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.role-button {
  width: 100%;
  height: 70px;
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
  .content-wrapper {
    padding: 0.5rem 1rem;
  }
  
  .user-input-section,
  .role-selection {
    max-width: 100%;
  }
  
  .user-input {
    :deep(.el-input__wrapper) {
      height: 55px;
    }
    
    :deep(.el-input__inner) {
      height: 55px;
      font-size: 1.25rem;
    }
  }
  
  .role-button {
    height: 65px;
    font-size: 1.3rem;
  }
  
  .main-section {
    gap: 2rem;
  }
}

@media (max-height: 700px) {
  .role-button {
    height: 60px;
    font-size: 1.2rem;
  }
  
  .main-section {
    margin-top: 0;
    padding-top: 1rem;
    gap: 1.5rem;
  }
}

/* 添加紧凑布局的媒体查询 */
@media (max-height: 600px) {
  .home-top {
    margin-bottom: 0.5rem;
    margin-top: 0;
  }
  
  .main-section {
    padding-top: 0;
    gap: 1rem;
  }
  
  .role-button {
    height: 50px;
    font-size: 1.1rem;
  }
}
</style>
