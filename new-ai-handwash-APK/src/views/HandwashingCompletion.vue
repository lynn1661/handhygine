<template>
  <div v-loading="loading" class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：左侧logo，中间按钮，右侧语言选择器 -->
      <div class="home-top">
        <!-- 左侧：logo -->
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        
        <!-- 中间：操作按钮 -->
        <div class="top-buttons">
          <el-button @click="tryAgain" class="top-action-button try-again">
            {{ $t("HandHygiene.tryagain") }}
          </el-button>
          <el-button @click="back" class="top-action-button home-button">
            <img src="../assets/homeIcon.png" class="home-icon" />
            {{ $t("HandHygiene.homepage") }}
          </el-button>
          <el-button @click="switchToAuditingMode" class="top-action-button auditing-mode-button">
            Switch to Auditing Mode
          </el-button>
        </div>
        
        <!-- 右侧：语言选择器 -->
        <div class="locale-selector">
          <select-locale :changeStyle="shouldChangeStyle"></select-locale>
        </div>
      </div>

      <!-- 主要内容区域 - 响应式布局 -->
      <div class="main-section">
        <!-- 左侧：成就展示区域 -->
        <div class="left-column">
          <div class="achievement-section">
            <div class="achievement-image">
              <img v-if="showImg === 'Novice'" src="/public/Novice.png" alt="Novice" />
              <img v-if="showImg === 'Pro'" src="/public/Pro.png" alt="Pro" />
              <img v-if="showImg === 'Master'" src="/public/Master.png" alt="Master" />
            </div>
            <div class="achievement-header">
              <span class="achievement-total">{{ $t("HandHygiene.totalScore") }} <span class="total-number">{{ total || 0 }}</span> !</span>
            </div>
            <div class="achievement-rank">
              {{ $t("HandHygiene.rank1") }} 
              <span class="rank-number">{{ rankMessage }}</span>
              {{ $t("HandHygiene.rank2") }}
            </div>
          </div>
        </div>

        <!-- 右侧：步骤评分列表 -->
        <div class="right-column">
          <!-- 步骤评分列表 -->
          <div class="steps-review-section">
            <el-scrollbar height="380px" always>
              <div class="step-rating-container">
                <div class="step-row" v-for="(item, index) in list.slice(0, 7)" :key="index">
                  <div class="star-section">
                    <div class="step-star">
                      <el-rate
                        :model-value="getStepRating(item.Step)"
                        :max="1"
                        :allow-half="true"
                        disabled
                        :colors="['#ffcc00', '#ffcc00', '#ffcc00']"
                        void-color="#c0c4cc"
                      />
                    </div>
                  </div>
                  <div class="comment-section">
                    <div class="comment-content">
                      <span class="comment-title">
                        {{ $t("HandHygiene.step" + (index + 1) + "Title") }}
                      </span>
                      <span class="comment-text">
                        {{ $t("HandHygiene.step" + (index + 1) + "Content") }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </div>
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
import { ElScrollbar, ElRate, ElDialog, ElTable, ElTableColumn, ElSwitch, ElButton } from 'element-plus'
const store = useStore();
const router = useRouter();
const loading = ref(true);
const t = useI18n();
const shouldChangeStyle = ref(true); // 默认不添加
const HandwashingType = ref();
const total = ref(0); // 添加total变量
const back = () => {
  localStorage.removeItem("accountID");
  sessionStorage.removeItem("accountID");
  localStorage.removeItem("accountSerialNumber");
  sessionStorage.removeItem("accountSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};
const tryAgain = () => {
  router.push({
    path: "/role",
  });
};

const switchToAuditingMode = () => {
  window.open("http://localhost:8080", "_blank");
};

const blobs = computed(() => {
  return store.state.user.blobs;
});
const downloadVideoName = ref();
const downloadVideo = async () => {
  for (let i = 0; i < blobs.value.length; i++) {
    const blobString = blobs.value[i];
    const fileName = `${downloadVideoName.value[i]}.mp4`;
    await saveVideoToGallery(blobString, fileName);
  }
};
async function saveVideoToGallery(videoData, fileName) {
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: videoData,
      directory: Directory.Documents,
      recursive: true,
    });
    console.log("视频已保存到相册:", result.uri);
  } catch (error) {
    console.error("保存视频到相册时出错:", error);
  }
}
const list = ref();
const showImg = ref("");
const downloadName = ref();
const rankMessage = ref("");
const getStepRating = (score) => {
  // 将0-15的分数转换为0-1的星星评分
  if (typeof score !== 'number') return 0;
  const rating = score / 15;
  // 限制在0-1范围内
  return Math.max(0, Math.min(1, rating));
};

// 性能指标相关
const performanceMetrics = computed(() => {
  return store.state.user.performanceMetrics || {
    jitterReduction: 0,
    occlusionPredictionAccuracy: 0,
    occlusionSmoothness: 0,
    trajectoryMatchRate: 0,
    frameRate: 0,
    keyPointDetectionCount: {
      raw: {},
      filtered: {}
    }
  };
});

// 判断是否有性能数据
const hasPerformanceData = computed(() => {
  return performanceMetrics.value.jitterReduction > 0 || 
         performanceMetrics.value.occlusionPredictionAccuracy > 0 || 
         performanceMetrics.value.trajectoryMatchRate > 0;
});

// 格式化关键点检测数据为表格数据
const keyPointTableData = computed(() => {
  const tableData = [];
  
  // 提取原始和过滤后的关键点数据
  const rawData = performanceMetrics.value.keyPointDetectionCount.raw || {};
  const filteredData = performanceMetrics.value.keyPointDetectionCount.filtered || {};
  
  // 构建表格数据
  for (let step = 1; step <= 7; step++) {
    const raw = rawData[step] || 0;
    const filtered = filteredData[step] || 0;
    
    // 计算提升率
    let improvement = 0;
    if (raw > 0) {
      improvement = ((filtered / raw - 1) * 100).toFixed(1);
    }
    
    tableData.push({
      step: `步骤${step}`,
      raw,
      filtered,
      improvement
    });
  }
  
  return tableData;
});

// 导出性能数据
const exportPerformanceData = () => {
  try {
    const metrics = performanceMetrics.value;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // 添加表头
    csvContent += "指标,值\r\n";
    
    // 添加数据
    csvContent += `抖动减少率(%),${metrics.jitterReduction.toFixed(2)}\r\n`;
    csvContent += `遮挡预测帧比例(%),${metrics.occlusionPredictionAccuracy.toFixed(2)}\r\n`;
    csvContent += `遮挡平滑度评估(%),${metrics.occlusionSmoothness ? metrics.occlusionSmoothness.toFixed(2) : '0.00'}\r\n`;
    csvContent += `轨迹匹配成功率(%),${metrics.trajectoryMatchRate.toFixed(2)}\r\n`;
    csvContent += `平均帧率,${metrics.frameRate}\r\n`;
    
    // 添加各步骤检测到的关键点数量对比
    csvContent += "\r\n步骤,原始关键点数,滤波后关键点数,提升率(%)\r\n";
    for (const row of keyPointTableData.value) {
      csvContent += `${row.step},${row.raw},${row.filtered},${row.improvement}\r\n`;
    }
    
    // 创建下载链接
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wash-performance-data-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    
    // 触发下载
    link.click();
    
    // 清理
    document.body.removeChild(link);
    
    ElNotification({
      title: "导出成功",
      message: "性能数据已成功导出为CSV文件",
      type: "success",
    });
  } catch (error) {
    console.error("导出性能数据失败:", error);
    ElNotification({
      title: "导出失败",
      message: "导出性能数据时发生错误",
      type: "error",
    });
  }
};

// 分数映射函数 - 使用幂函数实现低分提升但保持差距
const mapScore = (score) => {
  // 确保输入在0-100范围内
  if (score < 0) return 0;
  if (score > 100) return 100;
  
  // 使用幂函数 y = 100 * (x/100)^0.5 (平方根函数)
  // 这样映射：0->0, 20->45, 40->63, 60->77, 80->89, 100->100
  // 低分段提升更显著，让用户更有成就感
  const normalizedScore = score / 100;
  const mappedScore = 100 * Math.pow(normalizedScore, 0.4);
  
  return Math.round(mappedScore);
};

// 排名百分比映射函数 - 让低排名用户也能看到更好的排名显示
const mapRankPercentage = (percentage) => {
  // 确保输入在0-100范围内
  if (percentage < 0) return 0;
  if (percentage > 100) return 100;
  
  // 使用类似的幂函数 y = 100 * (x/100)^0.65
  // 这样映射：0->0, 10->21, 30->49, 50->69, 70->84, 90->95, 100->100
  // 低排名有显著提升，但仍保持差距和单调性
  const normalizedPercentage = percentage / 100;
  const mappedPercentage = 100 * Math.pow(normalizedPercentage, 0.5);
  
  return Math.round(mappedPercentage);
};

const showPerformanceMetrics = ref(false);

onMounted(async () => {
  // Get the download name for the video based on the account's serial number
  downloadName.value = getTime(
    sessionStorage.getItem("accountSerialNumber") ||
      localStorage.getItem("accountSerialNumber")
  );

  // Set a 2-second timeout to disable the loading state
  setTimeout(() => {
    loading.value = false;
  }, 2000);

  // Dispatch the 'rank' action to retrieve the user's ranking data from the store
  const id =
    sessionStorage.getItem("accountSerialNumber") || localStorage.getItem("accountSerialNumber");
  console.log("ID being sent: ", id); // Debugging step
  const res = await store.dispatch("user/rank", { id });
  console.log("Response from get_rank:", res); // Debugging step

  // Set the rank level (Novice, Pro, Master) from the backend response
  HandwashingType.value = res?.rankLevel;

  // Set the percentage of users beaten from the backend response
  const rankPercentage = res?.rankPercentage;

  // If a rank percentage is available, display a message showing the percentage
  if (rankPercentage !== undefined) {
    // 优先使用后端返回的映射后的排名百分比，如果没有则使用本地映射
    rankMessage.value = Math.floor(res?.mappedRankPercentage || mapRankPercentage(rankPercentage));
  }
  console.log(rankMessage.value); // Debug rankMessage value

  // Set the step correctness data from the backend response
  list.value = res?.step_points;
  
  // 设置用户总成绩，优先使用后端返回的映射后的分数
  total.value = Math.floor(res?.mappedScore || mapScore(res?.userScore || 0));
  
  // 后端不再提供step_video_files字段
  downloadVideoName.value = [];

  // Count the number of steps marked as "true" and adjust the rank image
  const trueCount = Array.isArray(list.value)
    ? list.value.reduce((count, step) => count + (step.Step ? 1 : 0), 0)
    : 0;

  // Update the rank image based on the number of correct steps
  if (trueCount >= 0 && trueCount <= 3) {
    showImg.value = "Novice";
  } else if (trueCount >= 4 && trueCount <= 6) {
    showImg.value = "Pro";
  } else if (trueCount === 7) {
    showImg.value = "Master";
  }

  downloadVideo();
  //ElNotification({
  //  title: "视频已保存到相册",
  //  type: "success",
  //});
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
  padding: 1rem; /* 增加边距，让容器有呼吸空间 */
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
  min-height: 90vh;
  position: relative;
  padding: 1.5rem;
  background-color: transparent;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  transition: none;
  
  @media (min-width: 768px) {
    &:hover {
      box-shadow: none;
      transform: none;
    }
  }
}

/* 顶部区域样式 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0 1rem; /* 减小padding */
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(15, 56, 124, 0.1);
  width: 100%;
  flex-wrap: wrap; /* 允许换行 */
  gap: 0.75rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem 0;
  }
}

.top-buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  justify-content: center; /* 居中对齐 */
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
    order: 3; /* 在小屏幕上移到底部 */
  }
  
  @media (min-width: 481px) and (max-width: 767px) {
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    gap: 1.5rem;
  }
}

.top-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1rem;
  height: auto;
  background-color: #1a56db;
  border-radius: 12px;
  border: none;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  min-width: 100px;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.1);
    transform: rotate(45deg);
    opacity: 0;
    transition: opacity 0.6s;
    z-index: 0;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
    
    &::before {
      opacity: 1;
      animation: shine 1.5s;
    }
  }
  
  .home-icon {
    width: 1.2rem;
    height: 1.2rem;
    margin-right: 0.4rem;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
    flex: 1;
  }
  
  @media (min-width: 768px) {
    font-size: 1.1rem;
    padding: 0.8rem 1.5rem;
    
    .home-icon {
      width: 1.5rem;
      height: 1.5rem;
      margin-right: 0.5rem;
    }
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-start; /* 左对齐 */
  flex: 1;
  
  @media (max-width: 480px) {
    order: 1; /* 在小屏幕上保持在顶部 */
    justify-content: center; /* 小屏幕居中 */
    gap: 0.5rem;
  }
  
  @media (min-width: 481px) {
    gap: 1rem;
  }
}

.logo-image {
  width: auto;
  height: 2.5rem; /* 减小基础高度 */
  transition: transform 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  
  &:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  }
  
  @media (max-width: 480px) {
    height: 2rem; /* 小屏幕上更小 */
  }
  
  @media (min-width: 768px) {
    height: 3.5rem; /* 桌面端适中 */
  }
}

.locale-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 右对齐 */
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0;
  position: relative;
  transition: transform 0.2s ease;
  padding: 0.5rem;
  border-radius: 10px;
  border: none;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    justify-content: center;
    order: 2; /* 在小屏幕上放中间 */
    width: auto;
    height: auto;
  }
}

/* 主要内容区域 - 响应式布局 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 1.5rem;
  justify-content: flex-start;
  margin-bottom: 1.5rem;
  align-items: flex-start;
  
  /* 桌面端左右分栏布局 */
  @media (min-width: 768px) {
    flex-direction: row !important;
    gap: 2rem !important;
    align-items: stretch !important;
  }
}

/* 左栏样式 */
.left-column {
  width: 100%;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    width: 45% !important;
  }
}

/* 右栏样式 */
.right-column {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    width: 55% !important;
  }
}

/* 成就展示区域 */
.achievement-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 20px;
  padding: 1.25rem; /* 进一步减小内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 25px rgba(15, 56, 124, 0.08);
  margin-bottom: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.8), transparent);
    opacity: 0.6;
    z-index: 0;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(15, 56, 124, 0.12);
  }
  
  @media (min-width: 768px) {
    padding: 1.75rem !important; /* 桌面端也进一步减小 */
    height: 100%;
    justify-content: flex-start;
  }
}

.achievement-image {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem; /* 进一步减小margin */
  position: relative;
  z-index: 1;
  
  &::after {
    content: '';
    position: absolute;
    width: 140%;
    height: 20px; /* 减小阴影高度 */
    background: radial-gradient(ellipse at center, rgba(15, 56, 124, 0.1) 0%, rgba(15, 56, 124, 0) 70%);
    bottom: -20px;
    border-radius: 50%;
    left: -20%;
    z-index: -1;
  }
  
  img {
    width: 65px; /* 进一步减小 */
    height: 65px; /* 进一步减小 */
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.9);
    position: relative;
    z-index: 2;
    transition: transform 0.5s ease, box-shadow 0.5s ease;
    
    &:hover {
      transform: scale(1.05) rotate(5deg);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }
    
    @media (min-width: 768px) {
      width: 130px !important; /* 桌面端进一步减小 */
      height: 130px !important; /* 桌面端进一步减小 */
      border-width: 3px !important;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
      
      &:hover {
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.14) !important;
      }
    }
  }
  
  @media (min-width: 768px) {
    margin-bottom: 1.25rem !important;
  }
}

.achievement-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem; /* 进一步减小间距 */
  margin-bottom: 0.75rem; /* 进一步减小底部间距 */
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
  
  @media (min-width: 768px) {
    gap: 0.4rem !important;
    margin-bottom: 1.25rem !important;
  }
}

.achievement-total {
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1rem; /* 进一步减小 */
  color: #0f387c;
  text-align: center;
  line-height: 1.4;
  position: relative;
  padding-bottom: 0.5rem; /* 进一步减小 */
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 35px; /* 进一步减小 */
    height: 2px;
    background: linear-gradient(90deg, #ffcc00, #ff9900);
    border-radius: 2px;
  }
  
  .total-number {
    color: #ff9900;
    font-size: 1.4rem; /* 进一步减小 */
    font-weight: 800;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    display: inline-block;
    margin: 0 0.2rem; /* 减小间距 */
  }
  
  @media (min-width: 768px) {
    font-size: 1.5rem !important; /* 桌面端进一步减小 */
    padding-bottom: 0.7rem !important;
    
    &::after {
      width: 45px !important;
      height: 3px !important;
    }
    
    .total-number {
      font-size: 2rem !important; /* 桌面端进一步减小 */
      margin: 0 0.3rem !important;
    }
  }
}

.achievement-rank {
  font-family: "Helvetica85", sans-serif;
  font-weight: 600;
  font-size: 1rem; /* 进一步减小 */
  color: #0f387c;
  text-align: center;
  line-height: 1.3;
  margin-top: 0.4rem; /* 减小间距 */
  
  .rank-number {
    color: #ff9900;
    font-size: 1.3rem; /* 进一步减小 */
    font-weight: 800;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    display: inline-block;
    margin: 0 0.2rem; /* 减小间距 */
  }
  
  @media (min-width: 768px) {
    font-size: 1.5rem !important; /* 桌面端进一步减小 */
    margin-top: 0.5rem !important;
    
    .rank-number {
      font-size: 1.8rem !important; /* 桌面端进一步减小 */
      margin: 0 0.3rem !important;
    }
  }
}

/* 步骤评分区域 */
.steps-review-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 56, 124, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(15, 56, 124, 0.12);
  }
  
  @media (min-width: 768px) {
    padding: 1.5rem;
    flex: 1;
    min-height: 450px;
  }
}

.step-rating-container {
  width: 100%;
  padding: 0.25rem;
}

.step-row {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #f9fbff 0%, #f2f6fc 100%);
  border-radius: 12px;
  min-height: 3.5rem;
  box-shadow: 0 4px 10px rgba(15, 56, 124, 0.06);
  transition: all 0.3s ease;
  border-left: 3px solid #4a89dc;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 40%;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(74, 137, 220, 0.3));
    border-radius: 3px;
  }
  
  &:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 8px 15px rgba(15, 56, 124, 0.1);
    border-left-color: #0f387c;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (min-width: 768px) {
    padding: 1rem;
    min-height: 4rem;
  }
}

.star-section {
  width: 3rem;
  min-width: 3rem;
  height: 3rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  box-shadow: 0 3px 8px rgba(15, 56, 124, 0.08);
  margin-right: 0.75rem;
  
  @media (min-width: 768px) {
    width: 3.5rem;
    min-width: 3.5rem;
    height: 3.5rem;
    margin-right: 1rem;
  }
}

.step-star {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.step-star :deep(.el-rate) {
  height: 2.25rem;
  font-size: 2.25rem;
  line-height: 1;
  
  @media (min-width: 768px) {
    height: 2.5rem;
    font-size: 2.5rem;
  }
}

.step-star :deep(.el-rate__icon) {
  font-size: 2.25rem;
  margin-right: 0;
  
  @media (min-width: 768px) {
    font-size: 2.5rem;
  }
}

.comment-section {
  flex: 1;
}

.comment-content {
  display: flex;
  flex-direction: column;
}

.comment-title {
  font-weight: 700;
  color: #0f387c;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  
  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
}

.comment-text {
  color: #4a5568;
  font-size: 0.9rem;
  line-height: 1.4;
  
  @media (min-width: 768px) {
    font-size: 1rem;
  }
}

/* 评分区域 */
.rating-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 56, 124, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(15, 56, 124, 0.12);
  }
  
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(74, 137, 220, 0.15), transparent 70%);
    z-index: 0;
  }
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
}

.rating-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  font-size: 1.25rem;
  color: #0f387c;
  padding: 0.5rem;
  font-weight: 600;
  text-align: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
  
  :deep(.el-button) {
    font-size: 1rem;
    padding: 0.75rem 1.75rem;
    font-weight: 600;
    background: linear-gradient(135deg, #2563eb 0%, #1a56db 100%);
    border-color: #1a56db;
    box-shadow: 0 4px 12px rgba(26, 86, 219, 0.3);
    transition: all 0.3s ease;
    
    &:hover {
      background: linear-gradient(135deg, #1e429f 0%, #1e40af 100%);
      border-color: #1e40af;
      box-shadow: 0 6px 16px rgba(26, 86, 219, 0.4);
      transform: translateY(-2px);
    }
  }
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
    
    :deep(.el-button) {
      font-size: 1.1rem;
      padding: 0.75rem 2.25rem;
    }
  }
}

.rating-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0.5rem;
  }
}

.rating-description {
  font-size: 1.1rem;
  color: #0f387c;
  margin-bottom: 0.5rem;
  font-weight: 500;
  
  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
}

.custom-rate {
  display: flex;
  justify-content: center;
  transform: scale(1.1);
  margin: 0.25rem 0;
  
  @media (min-width: 768px) {
    transform: scale(1.3);
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .content-wrapper {
    max-width: 1600px;
    padding: 2rem;
  }
  
  .main-section {
    gap: 3rem !important;
  }
}

/* 超宽显示器优化 */
@media (min-width: 1600px) {
  .main-section {
    gap: 4rem !important;
  }
  
  .left-column {
    width: 40% !important;
  }
  
  .right-column {
    width: 60% !important;
  }
}

/* 动画效果 */
@keyframes shine {
  0% {
    left: -50%;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    left: 150%;
    opacity: 0;
  }
}

/* 响应式布局优化 */
@media (min-height: 900px) {
  .main-section {
    gap: 1.5rem;
  }
  
  .home-top {
    margin-top: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .step-row {
    min-height: 4rem;
    padding: 1rem;
  }
}

@media (min-height: 700px) and (max-height: 899px) {
  .main-section {
    gap: 1rem;
  }
}

/* 添加额外的超小屏幕优化 */
@media (max-height: 600px) {
  .home {
    padding: 0.5rem;
  }
  
  .content-wrapper {
    padding: 1rem;
  }
  
  .home-top {
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
  }
  
  .main-section {
    gap: 0.75rem;
  }
  
  .achievement-section,
  .steps-review-section,
  .rating-section {
    padding: 1rem;
  }
  
  .achievement-image {
    margin-bottom: 1rem;
  }
  
  .achievement-image img {
    width: 110px;
    height: 110px;
  }
  
  .achievement-header {
    margin-bottom: 0.75rem;
  }
  
  .achievement-total {
    font-size: 1.5rem;
    
    .total-number {
      font-size: 1.8rem;
    }
  }
  
  .achievement-rank {
    font-size: 1.5rem;
    
    .rank-number {
      font-size: 1.8rem;
    }
  }
  
  .step-row {
    padding: 0.6rem;
    min-height: 3rem;
    margin-bottom: 0.5rem;
  }
  
  .star-section {
    width: 2.5rem;
    min-width: 2.5rem;
    height: 2.5rem;
  }
  
  .comment-title {
    font-size: 0.9rem;
  }
  
  .comment-text {
    font-size: 0.8rem;
  }
  
  .rating-content {
    font-size: 1.1rem;
  }
  
  .action-button {
    padding: 0.75rem;
    font-size: 1rem;
  }
}

/* 性能指标区域 */
.performance-metrics-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(15, 56, 124, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 25px rgba(15, 56, 124, 0.12);
  }
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgba(15, 56, 124, 0.1);
  padding-bottom: 0.75rem;
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f387c;
    margin: 0;
  }
  
  .metrics-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.metrics-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metrics-toggle {
  margin-right: 0.5rem;
}

.export-button {
  background-color: #0f387c;
  color: white;
  border: none;
  
  &:hover:not(:disabled) {
    background-color: #1a4da8;
    transform: translateY(-2px);
  }
  
  &:disabled {
    background-color: #ccc;
    color: #999;
    cursor: not-allowed;
  }
}

.no-metrics-message {
  text-align: center;
  padding: 2rem 0;
  color: #777;
  font-style: italic;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
}

.metrics-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metrics-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
}

.metric-card {
  flex: 1;
  min-width: 150px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f8ff 100%);
  border-radius: 15px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 5px 15px rgba(15, 56, 124, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(15, 56, 124, 0.1);
  }
  
  .metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.25rem;
    color: white;
    
    &.stability-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    &.occlusion-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    
    &.smoothness-icon {
      background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
    }
    
    &.trajectory-icon {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
  }
  
  .metric-details {
    display: flex;
    flex-direction: column;
    
    .metric-title {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 0.25rem;
    }
    
    .metric-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f387c;
    }
  }
}

.keypoint-detection-table {
  h4 {
    font-size: 1rem;
    color: #0f387c;
    margin: 0 0 0.75rem 0;
  }
  
  :deep(.el-table) {
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(15, 56, 124, 0.05);
    
    th {
      background-color: #f0f5ff;
      color: #0f387c;
    }
    
    td {
      padding: 0.5rem;
    }
  }
  
  .positive-improvement {
    color: #2ecc71;
    font-weight: 600;
  }
}

.metrics-hidden-message {
  text-align: center;
  padding: 2rem 0;
  color: #777;
  font-style: italic;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
}

/* 评分对话框样式 */
.rating-dialog {
  z-index: 9999 !important;
}

/* 确保Element Plus对话框正确显示 */
:deep(.el-dialog) {
  z-index: 9999 !important;
  background-color: white !important;
  border-radius: 15px !important;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3) !important;
}

:deep(.el-dialog__wrapper) {
  z-index: 9999 !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

:deep(.el-dialog__header) {
  background-color: #f8f9fa !important;
  border-radius: 15px 15px 0 0 !important;
  padding: 1.5rem !important;
}

:deep(.el-dialog__title) {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  color: #0f387c !important;
}

:deep(.el-dialog__body) {
  padding: 1.5rem !important;
}

:deep(.el-dialog__footer) {
  padding: 1rem 1.5rem 1.5rem !important;
  text-align: center !important;
}
</style>

