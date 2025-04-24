<template>
  <div v-loading="loading" class="home">
    <div class="content-wrapper">
      <!-- 顶部区域 -->
      <div class="home-top">
        <div class="left-section">
          <el-button 
            class="back-button"
            color="#409EFF" 
            round 
            :icon="ArrowLeft" 
            @click="goBack"
          >
            Previous Page
          </el-button>
        </div>
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="right-section">
          <div class="back-home">
            <img src="../assets/home.png" alt="Home" @click="backHome" class="home-icon" />
          </div>
        </div>
      </div>
      
      <!-- 主要内容区域 -->
      <div class="main-section">
        <!-- 日期选择器 -->
        <div class="date-picker-container">
          <div class="date-picker">
            <span class="date-label">Date Range</span>
            <el-date-picker
              v-model="value"
              type="daterange"
              unlink-panels
              range-separator="To"
              start-placeholder="Start date"
              end-placeholder="End date"
              :shortcuts="shortcuts"
              class="date-picker-input"
            />
          </div>
        </div>
        
        <!-- 排名列表表格 -->
        <div class="table-container">
          <el-table
            :data="rankList.records"
            style="width: 100%; height: 100%"
            :header-cell-style="headerStyle"
            stripe
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
            <el-table-column label="Step Points" min-width="130">
              <template #default="scope">
                <div v-for="(step, index) in scope.row.step_points" :key="index" class="step-point-item">
                  Step {{ index + 1 }}: {{ step.Step }}
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
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

const headerStyle = () => {
  return {
    background: "#ecf5ff",
    color: "#0f387c",
    fontWeight: "bold",
    borderBottom: "1px solid #d9ecff"
  };
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

/* 整体容器布局 */
.home {
  width: 100%;
  min-height: 100vh;
  background-image: url("../assets/bg.png");
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
  min-height: calc(100vh - 2rem);
}

/* 顶部区域 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  width: 100%;
}

.left-section, .right-section {
  width: 150px;
  display: flex;
  align-items: center;
}

.left-section {
  justify-content: flex-start;
}

.right-section {
  justify-content: flex-end;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
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

.back-button {
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.back-home {
  display: flex;
  align-items: center;
  justify-content: center;
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
  gap: 0.75rem;
  padding: 0;
  min-height: calc(100vh - 140px);
}

/* 日期选择器 */
.date-picker-container {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.date-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.date-label {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f387c;
}

.date-picker-input {
  width: 100%;
  max-width: 500px;
}

/* 表格容器 */
.table-container {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 240px);
}

:deep(.el-table) {
  background-color: transparent !important;
  flex: 1;
  
  .el-table__header-wrapper th {
    background-color: #ecf5ff !important;
  }
  
  .el-table__body, .el-table__footer, .el-table__header {
    background-color: transparent;
  }
  
  .el-table__inner-wrapper {
    height: 100%;
  }
  
  .el-table__body-wrapper {
    overflow-y: auto;
  }
  
  .el-table__row {
    background-color: transparent !important;
    
    &.el-table__row--striped {
      background-color: rgba(250, 250, 250, 0.4) !important;
    }
    
    &:hover > td {
      background-color: rgba(236, 245, 255, 0.4) !important;
    }
  }
  
  .el-table__cell {
    padding: 8px 0;
  }
}

.step-point-item {
  margin: 0.15rem 0;
  padding: 0.15rem 0;
  border-bottom: 1px dashed rgba(64, 158, 255, 0.15);
  
  &:last-child {
    border-bottom: none;
  }
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 0.5rem;
  }
  
  .main-section {
    gap: 0.5rem;
    min-height: calc(100vh - 120px);
  }
  
  .table-container {
    min-height: calc(100vh - 220px);
  }
  
  .date-label {
    font-size: 1.1rem;
  }
  
  :deep(.el-table) {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .home-top {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .left-section, .right-section {
    width: auto;
  }
  
  .logo {
    order: -1;
    width: 100%;
    margin-bottom: 0.5rem;
    justify-content: center;
  }
  
  .date-picker-container, .table-container {
    padding: 0.75rem;
  }
  
  .main-section {
    min-height: calc(100vh - 160px);
  }
  
  .table-container {
    min-height: calc(100vh - 250px);
  }
  
  :deep(.el-table) {
    font-size: 0.8rem;
  }
}
</style>
