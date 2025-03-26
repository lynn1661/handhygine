<template>
  <div class="home">
    <div class="logo">
      <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
      <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
    </div>
    <div class="home-top">
      <div class="back-home">
        <img src="../assets/home.png" alt="" @click="backHome" />
      </div>
      <select-locale :changeStyle="shouldChangeStyle"></select-locale>
    </div>
    <div class="home-input">
      <el-input
        v-model="userID"
        :placeholder="$t('HandHygiene.userID')"
      />
    </div>
    <div class="role">
      <el-button @click="selectRole('Doctor')"> {{ $t("HandHygiene.role1") }}</el-button>
      <el-button @click="selectRole('Nurse')"> {{ $t("HandHygiene.role2") }}</el-button>
      <el-button @click="selectRole('Allied Health')"> {{ $t("HandHygiene.role3") }}</el-button>
      <el-button @click="selectRole('Other')"> {{ $t("HandHygiene.role4") }}</el-button>
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
//import { validateStudentID } from "../utils/formatData";
import { ElAvatar } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus';
import { onMounted, onUnmounted } from 'vue';
const store = useStore();
const router = useRouter();
const t = useI18n();
const shouldChangeStyle = ref(false); // 默认不添加
const userID = ref("");
async function selectRole(role) {
  const studentID = localStorage.getItem("studentID");
  const res = await store.dispatch("user/updateRole", { 
    ID: studentID,
    userID: ID,
    role: role, 
  });
  localStorage.setItem("studentSerialNumber", res.ID);
  sessionStorage.setItem("studentSerialNumber", res.ID);
  //localStorage.setItem("userRole", role);
  //sessionStorage.setItem("userRole", role);
  router.push({
    path: "/detecting",
  });
};
const backHome = () => {
  localStorage.removeItem("studentID");
  sessionStorage.removeItem("studentID");
  localStorage.removeItem("studentSerialNumber");
  sessionStorage.removeItem("studentSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};
let inactivityTimer = null;

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
});
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.selectOption {
  font-family: "SourceHanSansCN";
  font-size: 26px;
}
.logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: -40px;
    }
    .logo-image {
      width: auto;
      height: 50px;  
    }
.home {
  width: 100%;
  height: 100%;
  background-image: url("../assets/HandHygienebg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  &-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .back-home {
      width: 126px;
      height: 126px;
      margin-right: 10px;
      img {
        margin-top: 30px;
        width: 100%;
        height: 100%;
      }
    }
  }
}
.home-input{
  text-align: center;
  
  
  //width: 90%;
  margin: 260px auto 0;

  :deep(.el-input) {
    width: 626px;
    height: 90px;
    margin: 25px;
  }
  :deep(.el-input__wrapper) {
    background: #f5f8fd;
    border-radius: 26px 26px 26px 26px;
  }
  :deep(.el-input__inner) {
    font-family: "SourceHanSansCN";
    font-size: 26px;
    color: #b4c1d5;
    height: 60px;
  }
}
.role {
  //width: 90%;
  //margin: 330px auto 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px; 

  :deep(.el-button) {
    width: 626px;
    height: 100px;
    font-family: Helvetica85;
    font-weight: 800;
    font-size: 32px;
    color: #ffffff;
    line-height: 16px;
    font-style: normal;
    text-transform: none;
    border-radius: 26px;
    background-image: url(../assets/button.png);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
}
</style>
