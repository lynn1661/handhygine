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
          <el-button @click="switchToAuditingMode" class="auditing-mode-button">
            Switch to Auditing Mode
          </el-button>
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
              v-model="dateRange"
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
        
        <!-- 总体评分摘要 -->
        <div class="summary-section" v-if="feedbackData">
          <h2 class="section-title">{{ $t('UserFeedback.overallSummary') }}</h2>
          <div class="summary-card">
            <div class="summary-info">
              <div class="summary-item" v-for="(category, index) in categories" :key="index">
                <div class="summary-label">{{ $t(`UserFeedback.categories.${category.id}`) }}</div>
                <div class="summary-value">{{ getAverageScore(category.id) }}</div>
                <div class="rating-display">
                  <el-rate
                    :model-value="getStarRating(category.id)"
                    disabled
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 评分分类统计 -->
        <div v-if="feedbackData" class="category-stats">
          <h2 class="section-title">{{ $t('UserFeedback.categoryStats') }}</h2>
          <div class="stats-grid">
            <div v-for="category in categories" :key="category.id" class="stat-card">
              <h3 class="category-title">{{ $t(`UserFeedback.categories.${category.id}`) }}</h3>
              <div class="stat-content">
                <div class="stat-item">
                  <span class="stat-label">{{ $t('UserFeedback.responses') }}:</span>
                  <span class="stat-value">{{ getCategoryStats(category.id).count || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">{{ $t('UserFeedback.averageScore') }}:</span>
                  <span class="stat-value highlight">{{ getCategoryStats(category.id).average || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">{{ $t('UserFeedback.scoreRange') }}:</span>
                  <span class="stat-value">
                    {{ getCategoryStats(category.id).min || 0 }} - {{ getCategoryStats(category.id).max || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 合并的柱状图容器 -->
        <div class="chart-container">
          <div class="chart-card">
            <div id="combined-chart" class="chart-content"></div>
          </div>
        </div>
      </div>
    </div>
  </div>  
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { ElNotification } from "element-plus";
import { ArrowLeft } from '@element-plus/icons-vue';
import SelectLocale from "@/components/SelectLocale.vue";
import * as echarts from 'echarts/core';
import { use } from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册echarts组件
use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  BarChart,
  PieChart,
  CanvasRenderer
]);

const store = useStore();
const router = useRouter();
const i18n = useI18n();
const { t } = i18n;
const loading = ref(true);
const feedbackData = ref(null);

// 评分类别数据
const categories = [
  { id: 'UI', color: '#409EFF' },
  { id: 'Training', color: '#67C23A' },
  { id: 'Recommendation', color: '#E6A23C' }
];

// 日期选择器相关
const dateRange = ref([
  new Date(), // 今天
  new Date() // 今天
]);

const shortcuts = [
  {
    text: 'All Dates',
    value: () => {
      const start = new Date(2020, 0, 1) // 从2020年开始
      const end = new Date() // 到今天结束
      return [start, end]
    },
  },
  {
    text: 'Last Week',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: 'Last Month',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: 'Last 3 Months',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
];

// 返回上一页
const goBack = () => {
  router.push('/rolerank');
};

// 返回首页
const backHome = () => {
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  router.push("/admin");
};

const switchToAuditingMode = () => {
  window.open("http://localhost:8080", "_blank");
};

// 获取评分数据
const fetchFeedbackData = async () => {
  loading.value = true;
  try {
    // 准备日期范围数据
    let dateRangeData = null;
    if (dateRange.value && dateRange.value.length === 2) {
      // 确保日期格式正确
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      
      dateRangeData = {
        start: formatDate(dateRange.value[0]),
        end: formatDate(dateRange.value[1])
      };
      
      console.log("使用日期范围:", dateRangeData);
    }
    
    // 调用store action获取数据
    const accountID = localStorage.getItem("accountID");
    const result = await store.dispatch("user/getAllRatings", {
      accountID,
      dateRange: dateRangeData
    });
    
    console.log("Feedback data:", result);
    feedbackData.value = result;
    
    // 初始化图表
    await nextTick();
    initCombinedChart();
    
  } catch (error) {
    console.error("Failed to fetch feedback data:", error);
    ElNotification({
      title: t('Error'),
      message: t('Failed to get user feedback data, please try again'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

// 获取特定类别的统计数据
const getCategoryStats = (categoryId) => {
  if (!feedbackData.value || !feedbackData.value.ratingsByCategory) {
    return { count: 0, average: 0, max: 0, min: 0 };
  }
  return feedbackData.value.ratingsByCategory[categoryId]?.stats || { count: 0, average: 0, max: 0, min: 0 };
};

// 获取平均分数（格式化为带小数点的字符串）
const getAverageScore = (categoryId) => {
  const stats = getCategoryStats(categoryId);
  return stats.average ? stats.average.toFixed(1) : '0.0';
};

// 将100分制的平均分转换为5分制的星级评分
const getStarRating = (categoryId) => {
  const stats = getCategoryStats(categoryId);
  // 100分制转为5分制，并保留一位小数
  return stats.average ? parseFloat((stats.average / 20).toFixed(1)) : 0;
};

// 初始化合并的柱状图
const initCombinedChart = () => {
  if (!feedbackData.value || !feedbackData.value.ratingsByCategory) {
    return;
  }
  
  const chartDom = document.getElementById('combined-chart');
  if (!chartDom) return;
  
  const chart = echarts.init(chartDom);
  
  // 处理评分分布数据
  const scoreRanges = ['1-2 ⭐', '3 ⭐', '4 ⭐', '5 ⭐'];
  const rangeDefinitions = [
    { min: 0, max: 40 },
    { min: 40, max: 60 },
    { min: 60, max: 80 },
    { min: 80, max: 101 }
  ];
  
  const seriesData = categories.map(category => {
    const scores = feedbackData.value.ratingsByCategory[category.id]?.scores || [];
    
    return {
      name: t(`UserFeedback.categories.${category.id}`),
      type: 'bar',
      barMaxWidth: 50,
      barGap: '10%',
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      itemStyle: {
        color: category.color,
        borderRadius: [3, 3, 0, 0]
      },
      data: rangeDefinitions.map(range => {
        return scores.filter(score => score >= range.min && score < range.max).length;
      })
    };
  });
  
  const option = {
    title: {
      text: t('UserFeedback.distribution'),
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 18,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        let result = `${params[0].name}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value} (${param.value > 0 ? ((param.value / getCategoryStats(param.seriesName.split(' ')[0]).count) * 100).toFixed(1) : 0}%)<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: categories.map(category => t(`UserFeedback.categories.${category.id}`)),
      bottom: 10,
      itemWidth: 15,
      itemHeight: 10,
      textStyle: {
        fontSize: 12
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: scoreRanges,
      axisLine: {
        lineStyle: {
          color: '#999'
        }
      },
      axisTick: {
        alignWithLabel: true
      },
      axisLabel: {
        rotate: 0,
        fontSize: 12,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      name: t('UserFeedback.responses'),
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: {
        fontWeight: 'bold',
        fontSize: 12,
        color: '#666'
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#999'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee'
        }
      }
    },
    series: seriesData
  };
  
  chart.setOption(option);
  
  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 监听日期范围变化以重新获取数据
watch(dateRange, async () => {
  await fetchFeedbackData();
});

// 监听语言变化，重新渲染图表
watch(() => i18n.locale.value, () => {
  nextTick(() => {
    initCombinedChart();
  });
});

// 组件挂载时获取数据
onMounted(async () => {
  // 确保初始日期设置正确
  const today = new Date();
  dateRange.value = [today, today]; 
  await fetchFeedbackData();
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
  padding: 1rem;
  box-sizing: border-box;
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
  margin-bottom: 2rem;
  width: 100%;
}

.left-section, .right-section {
  min-width: fit-content;
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
  background-color: #409EFF;
  color: white;
  border: none;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #66b1ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.auditing-mode-button {
  background-color: #409EFF;
  color: white;
  border: none;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  transition: all 0.3s ease;
  margin-right: 1rem;
  
  &:hover {
    background-color: #66b1ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
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
  gap: 1.5rem;
  padding: 1rem;
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

/* 总体评分摘要 */
.summary-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  color: #0f387c;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
}

.summary-card {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.summary-info {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}

.summary-item {
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
}

.summary-label {
  font-size: 1rem;
  font-weight: 600;
  color: #606266;
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: 700;
  color: #409EFF;
}

.rating-display {
  margin-top: 0.5rem;
}

/* 评分分类统计 */
.category-stats {
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
}

.category-title {
  color: #409EFF;
  font-size: 1.3rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 1rem;
  color: #606266;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  
  &.highlight {
    color: #409EFF;
    font-size: 1.25rem;
  }
}

/* 合并的图表容器 */
.chart-container {
  width: 100%;
}

.chart-card {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
}

.chart-content {
  width: 100%;
  height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-top {
    /* 移除flex-wrap: wrap，保持在一行 */
  }
  
  .left-section, .right-section {
    width: auto;
  }
  
  .logo {
    /* 移除order: -1和width: 100%，不再独占一行 */
    justify-content: center;
  }
  
  .summary-item {
    min-width: 150px;
  }
  
  .chart-content {
    height: 350px;
  }
  
  /* 平板设备上的stats-grid特定样式 */
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .stat-card {
    width: 100%;
    padding: 1.25rem;
  }
}

/* 平板设备专用 - 横向布局时优化为一行显示三个卡片 */
@media (min-width: 768px) and (max-width: 1024px) {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1.25rem 1rem;
  }
  
  .category-title {
    font-size: 1.1rem;
  }
  
  .stat-label, .stat-value {
    font-size: 0.95rem;
  }
  
  .stat-value.highlight {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  /* 在特别小的屏幕上可能需要调整，但仍然保持在一行 */
  .home-top {
    /* 保持紧凑布局但不换行 */
    gap: 0.5rem;
  }
  
  .back-button {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
  }
  
  .summary-info {
    flex-direction: column;
    align-items: center;
  }
  
  .summary-item {
    width: 100%;
  }
  
  .chart-content {
    height: 300px;
  }
  
  .actions-container {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style> 