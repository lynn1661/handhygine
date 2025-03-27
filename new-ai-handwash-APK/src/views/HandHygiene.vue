<template>
  <div class="home">
    <div class="logo">
      <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
      <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
    </div>
    <div class="home-top">
      <select-locale :changeStyle="shouldChangeStyle"></select-locale>
    </div>
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
      <el-button @click="started">{{ $t("HandHygiene.btn") }}</el-button>
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
  height: 60px;  
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
    justify-content: flex-end;
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
</style>
