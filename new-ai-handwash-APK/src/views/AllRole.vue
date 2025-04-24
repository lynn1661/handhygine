<template>
  <div v-loading="loading" class="home">
    <div class="content-wrapper">
      <!-- 顶部区域 -->
      <div class="home-top">
        <div class="left-section">
          <el-button 
            class="back-button"
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
              value-format="YYYY-MM-DD"
              class="date-picker-input"
            />
          </div>
        </div>
        
        <!-- 统计摘要卡片 -->
        <div class="summary-stats" v-if="Object.keys(rankData).length > 0">
          <h2 class="section-title">Overall Statistics</h2>
          <div class="stats-grid">
            <div v-for="(data, role) in rankData" :key="role" class="stat-card">
              <h3 class="role-title">{{ role }}</h3>
              <template v-if="Array.isArray(data)">
                <p class="stat-item">Total Records: {{ data.length }}</p>
                <p class="stat-item">Average Score: {{ calculateStats(data).average }}</p>
                <p class="stat-item">Score Range: {{ calculateStats(data).min }} - {{ calculateStats(data).max }}</p>
              </template>
              <template v-else>
                <p class="stat-item">Total Records: {{ data.stats?.count || 0 }}</p>
                <p class="stat-item">Average Score: {{ data.stats?.average || 0 }}</p>
                <p class="stat-item">Score Range: {{ data.stats?.min || 0 }} - {{ data.stats?.max || 0 }}</p>
              </template>
            </div>
          </div>
        </div>
        
        <!-- 图表容器 -->
        <div class="charts-container">
          <div v-for="(data, role) in rankData" :key="role" class="chart-card">
            <div :class="role.replace(/\s+/g, '-').toLowerCase() + '-chart'" class="chart-content"></div>
          </div>
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
import { nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { use } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
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

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer
]);

// 存储从后端接口返回的分组数据，对象键为角色，值为该角色的记录数组
const rankData = ref({});

const fetchRankData = async () => {
  const accountID = localStorage.getItem("accountID");
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
  
  loading.value = true;
  try {
    // 调用 Vuex action，传递 accountID 和日期范围
    const res = await store.dispatch("user/allrank", {
      accountID,
      dateRange
    });
    console.log("返回的数据:", res);
    if (res && res.records) {
      // 假设返回的 res.records 格式为：{ Doctor: [...], Nurse: [...], Allied Health: [...], Other: [...] }
      rankData.value = res.records;
    } else {
      console.error("返回的数据格式不正确:", res);
      ElNotification({
        title: '警告',
        message: '数据格式不正确，图表可能无法正确显示',
        type: 'warning',
      });
    }
  } catch (error) {
    console.error("获取排名数据失败:", error);
    ElNotification({
      title: '错误',
      message: '获取排名数据失败，请重试',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

// 计算统计信息
const calculateStats = (scores) => {
  if (!Array.isArray(scores) || scores.length === 0) {
    return {
      count: 0,
      average: 0,
      max: 0,
      min: 0
    };
  }
  
  return {
    count: scores.length,
    average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    max: Math.max(...scores),
    min: Math.min(...scores)
  };
};

// 处理饼图数据
const processDataForPie = (scores) => {
  if (!Array.isArray(scores)) {
    console.error('Invalid scores data:', scores);
    return [];
  }
  
  const ranges = [
    { name: '0-20 (Poor)', min: 0, max: 20, color: '#ff4d4f' },
    { name: '20-40 (Below Average)', min: 20, max: 40, color: '#ffa940' },
    { name: '40-60 (Average)', min: 40, max: 60, color: '#fadb14' },
    { name: '60-80 (Good)', min: 60, max: 80, color: '#73d13d' },
    { name: '80-100 (Excellent)', min: 80, max: 100, color: '#40a9ff' }
  ];
  
  return ranges.map(range => ({
    name: range.name,
    value: scores.filter(score => score >= range.min && score < range.max).length,
    itemStyle: {
      color: range.color
    }
  }));
};

// 初始化并渲染饼状图
const initCharts = async () => {
  await nextTick();
  
  for (const [role, data] of Object.entries(rankData.value)) {
    // 获取分数数组和统计信息
    const scores = Array.isArray(data) ? data : (data.scores || []);
    const stats = Array.isArray(data) ? calculateStats(data) : (data.stats || calculateStats(scores));
    
    const pieData = processDataForPie(scores);
    const className = role.replace(/\s+/g, '-').toLowerCase();
    const chartElement = document.querySelector(`.${className}-chart`);
    
    if (chartElement) {
      const chart = echarts.init(chartElement);
      const option = {
        title: {
          text: `${role} Performance Distribution`,
          subtext: `Total Records: ${stats.count}\nAverage Score: ${stats.average}\nHighest: ${stats.max}\nLowest: ${stats.min}`,
          left: 'center',
          top: 0,
          textStyle: {
            color: '#606266',
            fontSize: 16,
            fontWeight: 'bold'
          },
          subtextStyle: {
            color: '#909399',
            fontSize: 12,
            align: 'center'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const percentage = ((params.value / stats.count) * 100).toFixed(1);
            return `${params.name}\nCount: ${params.value}\nPercentage: ${percentage}%`;
          }
        },
        legend: {
          orient: 'vertical',
          left: 10,
          top: 'center',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: {
            fontSize: 12
          }
        },
        series: [
          {
            name: 'Score Distribution',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['60%', '60%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'outside',
              formatter: (params) => {
                const percentage = ((params.value / stats.count) * 100).toFixed(1);
                return `${params.name}\n${params.value} (${percentage}%)`;
              },
              fontSize: 12,
              color: '#606266'
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 10
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              },
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            data: pieData
          }
        ]
      };
      chart.setOption(option);
      
      // 添加窗口大小变化时的自适应
      window.addEventListener('resize', () => {
        chart.resize();
      });
    }
  }
};

onMounted(async () => {
  await fetchRankData();
  await initCharts();
  setTimeout(() => {
    loading.value = false;
  }, );
});

// 监听日期选择器变化，重新获取并渲染数据
watch(value, async () => {
  await fetchRankData();
  await initCharts();
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
}

/* 顶部区域 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
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
  height: 3rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    height: 2.5rem;
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
}

.back-button {
  background-color: #409EFF;
  color: white;
  border: none;
  font-weight: 600;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  
  &:hover {
    background-color: #66b1ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
  }
}

.back-home {
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-icon {
  width: 3rem;
  height: 3rem;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  @media (max-width: 480px) {
    width: 2.25rem;
    height: 2.25rem;
  }
}

/* 主要内容区域 */
.main-section {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  //background-color: rgba(255, 255, 255, 0);
  //border-radius: 16px;
  //box-shadow: 0 6px 16px rgba(15, 56, 124, 0.12);
  //backdrop-filter: blur(5px);
}

/* 日期选择器 */
.date-picker-container {
  width: 100%;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.date-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.date-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f387c;
}

.date-picker-input {
  width: 100%;
  max-width: 450px;
}

/* 统计摘要 */
.summary-stats {
  width: 100%;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  text-align: center;
  color: #0f387c;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }
}

.role-title {
  color: #409EFF;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  text-align: center;
}

.stat-item {
  margin: 0.5rem 0;
  color: #606266;
  font-size: 0.95rem;
}

/* 图表容器 */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(475px, 1fr));
  gap: 1.5rem;
  width: 100%;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  height: 450px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
}

.chart-content {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 0.5rem;
  }
  
  .main-section {
    padding: 0.75rem;
    gap: 1rem;
  }
  
  .section-title {
    font-size: 1.3rem;
  }
  
  .role-title {
    font-size: 1.1rem;
  }
  
  .chart-card {
    height: 400px;
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
  }
  
  .chart-card {
    height: 350px;
  }
}
</style>
