<template>
  <div v-loading="loading" class="home">
    <div style="height: 20px"></div>
    <div class="home-div">
      <div class="home-top">
        <div class="goback">
          <el-button 
          color="#409EFF" 
          style="color: #fff"
          size="large" 
          round 
          :icon="ArrowLeft" 
          @click="goBack"
        >Previous Page</el-button>
        </div>
          <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="back-home">
          <img src="../assets/home.png" alt="" @click="backHome" />
        </div>
      </div>
      <div class="date-picker">
        <div class="block">
          <span class="demonstration">Date</span>
          <el-date-picker
            v-model="value"
            type="daterange"
            unlink-panels
            range-separator="To"
            start-placeholder="Start date"
            end-placeholder="End date"
            :shortcuts="shortcuts"
          />
        </div>
      </div>
      <div class="home-ranklist">
        <el-table
          :data="rankList.records"
          style="background-color: transparent"
          :header-cell-style="headerStyle"
          height="760"
          :row-class-name="tableRowClass"
          >
          <!-- 角色列 -->
          <el-table-column 
            prop="role" 
            label="Role" 
            fixed="left" 
            width="90">
          </el-table-column>
          <!-- ID列 -->
          <el-table-column 
            prop="userID" 
            label="UserID" 
            width="90">
          </el-table-column>
          <!-- 成绩 -->
          <el-table-column 
            prop="total" 
            label="Score" 
            width="80">
          </el-table-column>
          <!-- 开始时间 -->
          <el-table-column 
            prop="start_time" 
            label="Start Time" 
            width="190">
          </el-table-column>
          <!-- 步骤得分列 -->
          <el-table-column label="Step Points" width="130">
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
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import SelectLocale from "@/components/SelectLocale.vue";
import { useRouter, useRoute} from "vue-router";
import { useStore } from "vuex";
import { getTime } from "../utils/formatData";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { ElNotification } from "element-plus";
import { ElScrollbar, ElRate, ElDialog} from 'element-plus'
import { ElDatePicker, ElTable } from 'element-plus';
import {ArrowLeft} from '@element-plus/icons-vue'
const store = useStore();
const router = useRouter();
const route = useRoute();
const role = route.query?.role;// 从 query 中读取 role 参数
const rankList = ref([]);// 定义排名列表数据
const loading = ref(true);
const t = useI18n();
const shouldChangeStyle = ref(true); // 默认不添加
const HandwashingType = ref();
const backHome = () => {
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  router.push({
    path: "/admin",
  });
};
const goBack = () => {
  router.push({
    path: "/rolerank",
  });
};
const value = ref([new Date(), new Date()]);
const shortcuts = [
  {
    text: 'All Dates',
    value: () => {
      const start = new Date(2020, 0, 1) // 从2020年开始
      const end = new Date(2030, 11, 31) // 到2030年结束
      return [start, end]
    },
  },
  {
    text: 'Last week',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: 'Last month',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: 'Last 3 months',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]


const thresholdLight = 60; 
const thresholdDeep = 80;  
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
const fetchRankList = async () => {
  let dateRange = null;
  if (value.value && value.value.length === 2) {
    const formatDate = (date) => {
      if (!date) return null;
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
          console.error('无效的日期:', date);
          return null;
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('日期格式化错误:', error);
        return null;
      }
    };
    
    const startDate = formatDate(value.value[0]);
    const endDate = formatDate(value.value[1]);
    
    if (startDate && endDate) {
      dateRange = {
        start: startDate,
        end: endDate
      };
      console.log('查询日期范围:', dateRange);
    } else {
      console.error('日期范围无效，使用默认值');
    }
  }
  
  const accountID = localStorage.getItem("accountID");
  loading.value = true;
  try {
    rankList.value = await store.dispatch("user/ranklist", {
      accountID: accountID,
      role: role,
      dateRange
    });
    console.log("获取到的数据:", rankList.value);
  } catch (error) {
    console.error("获取排名列表失败:", error);
    ElNotification({
      title: '错误',
      message: '获取排名数据失败，请重试',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};
onMounted(async () => {
  console.log("Role from query:", router.currentRoute.value.query.role);
  await fetchRankList();
  console.log("rankList", rankList.value)
  setTimeout(() => {
    loading.value = false;
  }, );
});
// 当日期选择器的值变化时，重新获取排名数据
watch(value, async (newVal, oldVal) => {
  await fetchRankList();
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
    .goback {
      display: flex;
      align-items: center;
      margin-top: 25px;
    }
    .logo {
      display: flex;
      align-items: center;
      margin-top: 25px;
    }
    .logo-image {
      width: auto;
      height: 55px;  
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
    //margin-top: 10px;
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
.date-picker {
  display: flex;
  width: 100%;
  padding: 0;
  flex-wrap: wrap;
}

.date-picker .block {
  padding: 20px 0;
  //margin-top: 10px;
  text-align: center;
  border-right: solid 1px var(--el-border-color);
  flex: 1;
}

.date-picker .block:last-child {
  border-right: none;
}

.date-picker .demonstration {
  display: block;
  color: var(--el-color-primary-dark-2);
  font-size: 22px;
  font-weight: 1000;
  margin-bottom: 5px;
}
</style>
