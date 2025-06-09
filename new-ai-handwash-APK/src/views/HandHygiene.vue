<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="top-actions">
          <el-button @click="switchToAuditingMode" class="auditing-mode-button">
            Switch to Auditing Mode
          </el-button>
          <div class="locale-selector">
            <select-locale :changeStyle="shouldChangeStyle"></select-locale>
          </div>
        </div>
      </div>
      
      <!-- 主要内容区域 -->
      <div class="main-section">
        
        
        <!-- 表单区域 -->
        <div class="form-container">
          <div class="home-personal">{{ $t("HandHygiene.personal") }}</div>
          <div class="input-group">
            <el-input
              v-model="accountID"
              :placeholder="$t('HandHygiene.accountID')"
              class="login-input"
            />
          </div>
          <div class="input-group">
            <el-input
              v-model="password"
              show-password
              :placeholder="$t('HandHygiene.password')"
              class="login-input"
              @keyup.enter="started"
            />
          </div>
          
          <!-- 按钮区域 -->
          <div class="button-group">
            <el-button @click="started" class="login-button">
              {{ $t("HandHygiene.btn") }}
            </el-button>
            <el-button @click="register" class="register-button">
              {{ $t("HandHygiene.register") }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import SelectLocale from "@/components/SelectLocale.vue";
import { ElNotification } from "element-plus";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { UserFilled } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus'
const store = useStore();
const router = useRouter();
const t = useI18n();
const shouldChangeStyle = ref(false); // 默认不添加
const accountID = ref("");
const password = ref("");

async function started() {
  try {
    const res = await store.dispatch("user/login", {
      accountID: accountID.value,
      password: password.value
    });
    localStorage.setItem("accountID", accountID.value);
    sessionStorage.setItem("accountID", accountID.value);
    ElNotification({
      title: res.message,
      type: "success"
    });
    setTimeout(() => {
      router.push({ path: "/role" });
    }, 1000);
  } catch (e) {
    console.log(e);
    ElNotification({
      title: "Login Error",
      type: "error"
    });
    accountID.value = "";
    password.value = "";
  }
}

async function register() {
  // 验证输入
  if (!accountID.value.trim()) {
    ElNotification({
      title: "Error",
      message: "Please enter Account ID",
      type: "error"
    });
    return;
  }
  
  if (!password.value.trim()) {
    ElNotification({
      title: "Error", 
      message: "Please enter Password",
      type: "error"
    });
    return;
  }
  
  if (password.value.length < 6) {
    ElNotification({
      title: "Error",
      message: "Password must be at least 6 characters",
      type: "error"
    });
    return;
  }
  
  try {
    const res = await store.dispatch("user/register", {
      accountID: accountID.value,
      password: password.value
    });
    
    ElNotification({
      title: "Success",
      message: res.message,
      type: "success"
    });
    
    // 注册成功后清空表单
    accountID.value = "";
    password.value = "";
    
  } catch (e) {
    console.log(e);
    let errorMessage = "Registration failed";
    
    // 根据错误类型显示不同消息
    if (e.message.includes("already exists")) {
      errorMessage = "Account ID already exists";
    } else if (e.message.includes("6 characters")) {
      errorMessage = "Password must be at least 6 characters";
    } else if (e.message.includes("empty")) {
      errorMessage = "Please fill in all fields";
    }
    
    ElNotification({
      title: "Registration Error",
      message: errorMessage,
      type: "error"
    });
  }
}

const switchToAuditingMode = () => {
  window.open("http://localhost:8080", "_blank");
};
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: 1rem;
  overflow-x: hidden;
  position: relative;
}

.content-wrapper {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  position: relative;
}

/* 顶部区域 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-image {
  width: auto;
  height: 3rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auditing-mode-button {
  padding: 0.5rem 1rem;
  background-color: #409EFF;
  border: none;
  border-radius: 10px;
  color: #ffffff;
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #66B1FF;
  }
}

.locale-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0.5rem;
  border-radius: 10px;
  border: none;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.15);
  }
  
  :deep(.el-select) {
    .el-input__wrapper {
      background: rgba(245, 248, 253, 0.9);
      border: 1px solid rgba(90, 144, 220, 0.3);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #5a90dc;
        box-shadow: 0 4px 12px rgba(90, 144, 220, 0.2);
      }
    }
    
    .el-input__inner {
      color: #0f387c;
      font-weight: 600;
    }
    
    .el-input__suffix-inner {
      background-color: rgba(90, 144, 220, 0.1);
      border-radius: 4px;
      
      &:hover {
        background-color: rgba(90, 144, 220, 0.2);
      }
    }
  }
}

/* 主要内容区域 */
.main-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  
  @media (max-height: 700px) {
    margin-top: 2vh; /* 更小屏幕上更靠上 */
  }
}

.home-personal {
  font-family: "Helvetica85", sans-serif;
  font-weight: 800;
  font-size: 2rem;
  color: #0f387c;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 1.25rem;
  }
}

/* 表单区域 */
.form-container {
  width: 100%;
  max-width: 550px;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.12);
  border: 1px solid rgba(15, 56, 124, 0.08);
  
  @media (max-width: 768px) {
    max-width: 90%;
    padding: 1.25rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
}

.input-group {
  margin-bottom: 1.5rem;
  
  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
}

.login-input {
  :deep(.el-input__wrapper) {
    background: #f5f8fd;
    border-radius: 12px;
    padding: 0.75rem 1.25rem;
    border: 1px solid rgba(15, 56, 124, 0.1);
    box-shadow: 0 2px 6px rgba(15, 56, 124, 0.05);
    transition: all 0.3s ease;
    
    &:hover, &:focus {
      box-shadow: 0 4px 12px rgba(15, 56, 124, 0.1);
      border-color: rgba(15, 56, 124, 0.2);
    }
  }
  
  :deep(.el-input__inner) {
    font-family: "SourceHanSansCN", sans-serif;
    font-size: 1.1rem;
    color: #0f387c;
    height: auto;
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }
}

.button-group {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  
  @media (max-width: 480px) {
    margin-top: 1.5rem;
    flex-direction: column;
    gap: 0.75rem;
  }
}

.login-button {
  flex: 1;
  max-width: 160px;
  padding: 0.9rem 1.25rem;
  height: auto;
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #ffffff;
  background-image: url("../assets/button.png");
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  border: none;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 0.8rem 1rem;
  }
  
  @media (max-width: 480px) {
    max-width: none;
    font-size: 1rem;
    padding: 0.7rem 0.8rem;
  }
}

.register-button {
  flex: 1;
  max-width: 160px;
  padding: 0.9rem 1.25rem;
  height: auto;
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #ffffff;
  background-image: url("../assets/button.png");
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  border: none;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 0.8rem 1rem;
  }
  
  @media (max-width: 480px) {
    max-width: none;
    font-size: 1rem;
    padding: 0.7rem 0.8rem;
  }
}

/* 响应式布局优化 */
@media (min-height: 900px) {
  .main-section {
    margin-top: 10vh; /* 大屏幕上仍然保持一定距离 */
  }
}

@media (max-height: 600px) {
  .home-personal {
    font-size: 1.35rem;
    margin-bottom: 1rem;
  }
  
  .input-group {
    margin-bottom: 0.75rem;
  }
  
  .login-input {
    :deep(.el-input__wrapper) {
      padding: 0.5rem 1rem;
    }
    
    :deep(.el-input__inner) {
      font-size: 0.9rem;
    }
  }
  
  .button-group {
    margin-top: 1rem;
  }
  
  .login-button,
  .register-button {
    font-size: 1rem;
    padding: 0.5rem 0.7rem;
  }
}
</style>
