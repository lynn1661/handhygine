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
      <div class="charts-container">
        <div v-for="(roleData, role) in rankData" :key="role" class="chart">
          <div :class="role.replace(/\s+/g, '-').toLowerCase() + '-chart'" class="chart-content"></div>
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

// 将每个角色的记录数据转换为饼状图数据：统计每个分数区间的人数（总分 35，每 7 分一个区间）
const processDataForPie = (roleData) => {
  if (!roleData || !roleData.scores) return [];
  
  const ranges = [
    { name: '0-20 (Poor)', min: 0, max: 20 },
    { name: '20-40 (Below Average)', min: 20, max: 40 },
    { name: '40-60 (Average)', min: 40, max: 60 },
    { name: '60-80 (Good)', min: 60, max: 80 },
    { name: '80-100 (Excellent)', min: 80, max: 100 }
  ];
  
  return ranges.map(range => ({
    name: range.name,
    value: roleData.scores.filter(score => score >= range.min && score < range.max).length
  }));
};

// 初始化并渲染饼状图
const initCharts = async () => {
  await nextTick();
  for (const [role, roleData] of Object.entries(rankData.value)) {
    const pieData = processDataForPie(roleData);
    const className = role.replace(/\s+/g, '-').toLowerCase();
    const chartElement = document.querySelector(`.${className}-chart`);
    if (chartElement) {
      const chart = echarts.init(chartElement);
      const option = {
        title: {
          text: `${role} Performance Distribution`,
          subtext: `Total Records: ${roleData.stats.count}\nAverage Score: ${roleData.stats.average}\nHighest: ${roleData.stats.max}\nLowest: ${roleData.stats.min}`,
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
          formatter: '{b}: {c} ({d}%)'
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
              formatter: '{b}: {c}\n({d}%)',
              fontSize: 12
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
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 20px;
  padding: 20px;
  margin-top: 20px;
}
.chart {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  height: 400px;
}
.chart-title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}
.chart-content {
  width: 100%;
  height: 100%;
}
</style>
