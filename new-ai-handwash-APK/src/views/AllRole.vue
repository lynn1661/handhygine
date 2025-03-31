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
        <!-- 遍历每个角色数据，生成对应的饼状图容器 -->
        <div v-for="(records, role) in rankData" :key="role" class="chart">
          
          <!-- 每个图表容器，需要一个独立的 ref 标识 -->
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
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    dateRange = {
      start: formatDate(value.value[0]),
      end: formatDate(value.value[1])
    };
  }
  // 调用 Vuex action，传递 accountID 和日期范围
  const res = await store.dispatch("user/allrank", {
    accountID,
    dateRange
  });
  console.log("res from allrank:", res);
  // 假设返回的 res.records 格式为：{ Doctor: [...], Nurse: [...], Allied Health: [...], Other: [...] }
  rankData.value = res.records;
};

// 将每个角色的记录数据转换为饼状图数据：统计每个分数区间的人数（总分 35，每 7 分一个区间）
const processDataForPie = (records) => {
  const ranges = [
    { name: '0-7', min: 0, max: 7 },
    { name: '7-14', min: 7, max: 14 },
    { name: '14-21', min: 14, max: 21 },
    { name: '21-28', min: 21, max: 28 },
    { name: '28-35', min: 28, max: 35 }
  ];
  return ranges.map(range => ({
    name: range.name,
    value: records.filter(total => total >= range.min && total < range.max).length
  }));
};

// 初始化并渲染饼状图
const initCharts = async () => {
  await nextTick();
  for (const role in rankData.value) {
    const records = rankData.value[role];
    const pieData = processDataForPie(records);
    // 查找对应角色的图表容器，假设容器 class 为 "Doctor-chart" 等
    const className = role.replace(/\s+/g, '-').toLowerCase();
    const chartElement = document.querySelector(`.${className}-chart`);
    if (chartElement) {
      const chart = echarts.init(chartElement);
      const option = {
        color: [
          'rgb(197.7, 225.9, 255)',
          'rgb(159.5, 206.5, 255)', 
          'rgb(121.3, 187.1, 255)', 
          '#409EFF',
          'rgb(51.2, 126.4, 204)'
          ], 
        title: {
          text: role,
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: 'Score Distribution',
            type: 'pie',
            radius: '50%',
            data: pieData,
            label: {
              show: false,
            },
            labelLine: {
              show: false
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
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
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}
.chart {
  width: 45%;
  height: 400px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
}
.chart-title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}
.chart-content {
  width: 100%;
  height: calc(100% - 40px);
}
</style>
