<template>
  <div v-loading="loading" class="home">
    <div style="height: 20px"></div>
    <div class="home-div">
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="back-home">
          <img src="../assets/home.png" alt="" @click="backHome" />
        </div>
      </div>
      <div class="home-ranklist">
        <el-table
          :data="rankList.records"
          style="background-color: transparent"
          :header-cell-style="headerStyle"
          height="900"
          :row-class-name="tableRowClass"
          >
          <!-- 角色列 -->
          <el-table-column 
            prop="role" 
            label="Role" 
            fixed="left" 
            width="100">
          </el-table-column>
          <!-- 成绩 -->
          <el-table-column 
            prop="total" 
            label="Score" 
            width="100">
          </el-table-column>
          <!-- 开始时间 -->
          <el-table-column 
            prop="start_time" 
            label="Start Time" 
            width="200">
          </el-table-column>
          <!-- 步骤得分列 -->
          <el-table-column label="Step Points" width="200">
            <template #default="scope">
              <div v-for="(step, index) in scope.row.step_points" :key="index">
                Step {{ index + 1 }}: {{ step.Step }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>  
</template>


<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import SelectLocale from "@/components/SelectLocale.vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { getTime } from "../utils/formatData";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { ElNotification } from "element-plus";
import { ElScrollbar, ElRate, ElDialog, ElTable } from 'element-plus'
const store = useStore();
const router = useRouter();
const role = router.query?.role || "Doctor";// 从 query 中读取 role 参数
const rankList = ref([]);// 定义排名列表数据
const loading = ref(true);
const t = useI18n();
const shouldChangeStyle = ref(true); // 默认不添加
const HandwashingType = ref();const backHome = () => {
  localStorage.removeItem("studentID");
  sessionStorage.removeItem("studentID");
  localStorage.removeItem("studentSerialNumber");
  sessionStorage.removeItem("studentSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};
const thresholdLight = 35 * 0.6; // 21 
const thresholdDeep = 35 * 0.8;  // 28 
const headerStyle = () => {
  return {
    background: "var(--el-color-primary-light-5)", // 表头背景色
    color: "#333",        // 表头文本颜色
    fontWeight: "bold"
  };
};
const tableRowClass = ({ row, rowIndex }) => {
  if (row.total > thresholdDeep) {
    return 'deep-blue';
  } else if (row.total > thresholdLight) {
    return 'light-blue';
  } else {
    return '';
  }
};
onMounted(async () => {
  rankList.value = await store.dispatch("user/ranklist", {role:role});
  console.log("rankList", rankList.value)
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});

</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.home {
  width: 100%;
  height: 100%;
  background-image: url("../assets/bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  &-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 55px;
    .logo {
      display: flex;
      align-items: center;
      margin-top: 25px;
    }
    .logo-image {
      width: auto;
      height: 50px;  
    }
    .back-home {
      width: 100px;
      height: 100px;
      //margin-right: 10px;
      img {
        margin-top: 10px;
        width: 100%;
        height: 100%;
      }
    }
  }
  &-div {
    //background-image: url("../assets/divBG.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    margin: 0px 63px 23px 63px;
  }
  &-ranklist {
    margin-top: 30px;
    //background-color: rgba(255, 255, 255, 0.5);
    padding: 20px;
  }
}
:global(.el-table .deep-blue) {
  --el-table-tr-bg-color: rgba(197.7, 225.9, 255);
}
:global(.el-table .light-blue) {
  --el-table-tr-bg-color: rgb(216.8, 235.6, 255);
}
</style>
