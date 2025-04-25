<template>
  <div class="home">
    <div class="content-wrapper">
      <!-- 顶部区域 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="back-home">
          <img src="../assets/home.png" alt="Home" @click="backHome" class="home-icon" />
        </div>
      </div>
      
      <!-- 主要内容区域 -->
      <div class="main-section">
        <div class="role-container">
          <div class="role-buttons">
            <!-- 第一行：单独按钮 -->
            <el-button @click="allRole" class="role-button full-width">
              {{ $t("HandHygiene.allrole") }}
            </el-button>
            
            <!-- 第二行：两个按钮 -->
            <div class="button-row">
              <el-button @click="RoleRank('Doctor')" class="role-button half-width">
                {{ $t("HandHygiene.role1") }}
              </el-button>
              <el-button @click="RoleRank('Nurse')" class="role-button half-width">
                {{ $t("HandHygiene.role2") }}
              </el-button>
            </div>
            
            <!-- 第三行：两个按钮 -->
            <div class="button-row">
              <el-button @click="RoleRank('Allied Health')" class="role-button half-width">
                {{ $t("HandHygiene.role3") }}
              </el-button>
              <el-button @click="RoleRank('Other')" class="role-button half-width">
                {{ $t("HandHygiene.role4") }}
              </el-button>
            </div>
            
            <!-- 第四行：单独按钮 -->
            <el-button @click="goToFeedback" class="role-button full-width feedback-button">
              {{ $t("HandHygiene.feedback") }}
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
//import { validateaccountID } from "../utils/formatData";
//import { ElAvatar } from 'element-plus';
//import { UserFilled } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus'
const store = useStore();
const router = useRouter();
const t = useI18n();
const shouldChangeStyle = ref(false); // 默认不添加
const allRole = () => {
  router.push({
    path: "/allrole",
  });
};
async function RoleRank(role) {
  //const res = await store.dispatch("user/ranklist", {role: role});
  router.push({
    path: "/roleranklist",
    query: {role}
  });
};
const backHome = () => {
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  router.push({
    path: "/admin",
  });
};

// 跳转到用户反馈页面
const goToFeedback = () => {
  router.push({
    path: "/feedback",
  });
};
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/HandHygienebg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: 1rem;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
}

/* 顶部区域 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 2rem;
  width: 100%;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
}

.logo-image {
  width: auto;
  height: 3.5rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    height: 3rem;
  }
  
  @media (max-width: 480px) {
    height: 2.5rem;
  }
}

.back-home {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.home-icon {
  width: 4rem;
  height: 4rem;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    width: 3.5rem;
    height: 3.5rem;
  }
  
  @media (max-width: 480px) {
    width: 3rem;
    height: 3rem;
  }
}

/* 主要内容区域 */
.main-section {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 30vh;
}

.role-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
}

.role-buttons {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* 按钮行样式 */
.button-row {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* 按钮宽度类 */
:deep(.role-button.full-width) {
  width: 100%;
  max-width: 580px;
}

:deep(.role-button.half-width) {
  width: calc(50% - 0.5rem);
  max-width: 290px;
}

:deep(.role-button) {
  height: 90px;
  font-family: Helvetica85;
  font-weight: 800;
  font-size: 28px;
  color: #ffffff;
  line-height: 16px;
  font-style: normal;
  text-transform: none;
  border-radius: 26px;
  background-image: url(../assets/button.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 0.5rem;
  }
  
  .main-section {
    margin-top: 20vh;
  }
  
  .role-container {
    padding: 1rem 0;
  }
  
  .role-buttons {
    gap: 1.5rem;
  }
  
  :deep(.role-button) {
    height: 80px;
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .home-top {
    margin-bottom: 1rem;
  }
  
  .main-section {
    margin-top: 12vh;
  }
  
  .role-buttons {
    gap: 1rem;
  }
  
  .button-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  :deep(.role-button.half-width) {
    width: 100%;
    max-width: 580px;
  }
  
  :deep(.role-button) {
    height: 70px;
    font-size: 18px;
  }
}
</style>
