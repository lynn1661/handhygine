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
    <div class="role">
      <el-button @click="RoleRank('Doctor')"> {{ $t("HandHygiene.role1") }}</el-button>
      <el-button @click="RoleRank('Nurse')"> {{ $t("HandHygiene.role2") }}</el-button>
      <el-button @click="RoleRank('Allied Health')"> {{ $t("HandHygiene.role3") }}</el-button>
      <el-button @click="RoleRank('Other')"> {{ $t("HandHygiene.role4") }}</el-button>
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
//import { ElAvatar } from 'element-plus';
//import { UserFilled } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus'
const store = useStore();
const router = useRouter();
const t = useI18n();
const shouldChangeStyle = ref(false); // 默认不添加

async function RoleRank(role) {
  //const res = await store.dispatch("user/ranklist", {role: role});
  router.push({
    path: "/roleranklist",
    query: {role}
  });
};
const backHome = () => {
  localStorage.removeItem("studentID");
  sessionStorage.removeItem("studentID");
  router.push({
    path: "/admin",
  });
};
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
.role {
  width: 90%;
  margin: 330px auto 0;
  
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px; 

  :deep(.el-button) {
    width: 626px;
    height: 118px;
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
