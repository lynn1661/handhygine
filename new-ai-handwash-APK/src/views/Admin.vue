<template>
  <div class="home">
    <div class="logo">
      <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
      <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
    </div>
    <div class="home-top">
      <div class="back-home">
        <div v-if="!HandHygiene">
          <img src="../assets/home.png" alt="" @click="backHome" />
        </div>
      </div>
      <select-locale :changeStyle="shouldChangeStyle"></select-locale>
    </div>
    <div v-if="HandHygiene">
      <div class="home-personal">{{ $t("HandHygiene.personal") }}</div>
      <div class="home-input">
        <div class="home-input-accountID">
          <el-input
            v-model="accountID"
            :placeholder="$t('HandHygiene.accountID')"
          />
        </div>
        <div class="home-input-password">
          <el-input
            v-model="password"
            show-password
            :placeholder="$t('HandHygiene.password')"
          />
        </div>
      </div>  
      <div class="home-btn">
        <el-button @click="started">{{ $t("HandHygiene.Adminbtn") }}</el-button>
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
import { ElAvatar } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';
import { ElButton } from 'element-plus'
const store = useStore();
const router = useRouter();
const t = useI18n();
const shouldChangeStyle = ref(false); // 默认不添加
const accountID = ref("");
const password = ref("");
const HandHygiene = ref(true);
async function started() {
  try {
    const res = await store.dispatch("user/login", {
      ID: accountID.value,
      password: password.value
    });
    localStorage.setItem("accountID", accountID.value);
    sessionStorage.setItem("accountID", accountID.value);
    ElNotification({
      title: res.message,
      type: "success"
    });
    setTimeout(() => {
      router.push({ path: "/rolerank" });
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
  &-title {
    width: 692px;
    height: 203px;
    line-height: 70px;
    background-color: rgba(108, 108, 108, 0.27);
    color: rgba(16, 16, 16, 1);
    font-size: 48px;
    text-align: center;
    box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.4);
    font-family: Roboto;
    border: 1px solid rgba(187, 187, 187, 1);
    margin: 0 auto;
    &-font {
      color: rgba(33, 84, 118, 1);
      font-size: 72px;
      text-align: center;
      font-family: Roboto-regular;
      line-height: 101px;
    }
    &-logo {
      margin-top: -51px;
      img {
        width: 200px;
        height: 200px;
      }
    }
  }
  &-personal {
    text-align: center;
    margin-top: 380px;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 32px;
    color: #0f387c;
    line-height: 39px;
    text-align: center;
    font-style: normal;
    text-transform: none;
    @include devices(tablet) {
      margin-top: 300px;
    }
  }
  &-input {
    text-align: center;
    &-accountID {
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
    &-password {
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
  }
  &-btn {
    text-align: center;
    margin-top: 20px;
    @include devices(tablet) {
      margin-top: 20px;
    }
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
      border-radius: 26px 26px 26px 26px;
      background-image: url(../assets/button.png);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
  }
}
.custom-option {
  color: rgba(108, 108, 108, 1);
  font-family: "SourceHanSansCN";
  font-size: 26px;
  height: 56px;
}
</style>
