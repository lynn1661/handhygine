<template>
  <div v-loading="loading" class="home">
    <div class="content-wrapper">
      <!-- 顶部区域：恢复原始风格 -->
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <div class="locale-selector">
          <select-locale :changeStyle="shouldChangeStyle"></select-locale>
        </div>
      </div>

      <!-- 主要内容区域 - 垂直布局 -->
      <div class="main-section">
        <!-- 成就展示区域 -->
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

        <!-- 步骤评分列表 -->
        <div class="steps-review-section">
          <el-scrollbar height="330px" always>
            <div class="step-rating-container">
              <div class="step-row" v-for="(item, index) in list" :key="index">
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
                      {{ $t(`HandHygiene.step${index + 1}Title`) }}
                    </span>
                    <span class="comment-text">
                      {{ $t(`HandHygiene.step${index + 1}Content`) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>

        <!-- 评分区域 -->
        <div class="rating-section">
          <div class="rating-content">
            {{ $t(`HandHygiene.rating`) }}
            <el-button 
              type="primary" 
              size="large" 
              @click="openDialog" 
              round
            >
              {{ $t(`HandHygiene.ratingbtn`) }}
            </el-button>
          </div>
          
          <!-- 评分对话框 -->
          <el-dialog
            :title="$t('HandHygiene.ratingtitle')"
            v-model="dialogVisible"
            width="400px"
            :before-close="handleClose"
          >
            <!-- 评分行1：App UI -->
            <div class="rating-row">
              <div class="rating-description">{{ $t('HandHygiene.ratingui') }}</div>
              <el-rate
                class="custom-rate"
                v-model="uiRating"
                size="large"
                @change="handleRatingChange('ui', $event)"
              />
            </div>
            <!-- 评分行2：洗手培训功能 -->
            <div class="rating-row">
              <div class="rating-description">{{ $t('HandHygiene.ratingtraining') }}</div>
              <el-rate
                class="custom-rate"
                v-model="trainingRating"
                size="large"
                @change="handleRatingChange('training', $event)"
              />
            </div>
            <!-- 评分行3：推荐给他人使用 -->
            <div class="rating-row">
              <div class="rating-description">{{ $t('HandHygiene.ratingrecommend') }}</div>
              <el-rate
                class="custom-rate"
                v-model="recommendRating"
                size="large"
                @change="handleRatingChange('recommend', $event)"
              />
            </div>
            <!-- 对话框底部操作按钮 -->
            <template #footer>
              <el-button @click="dialogVisible = false">{{ $t(`HandHygiene.ratingcancel`) }}</el-button>
              <el-button type="primary" @click="submitRating" :disabled="disabledRating">{{ $t(`HandHygiene.ratingsubmit`) }}</el-button>
            </template>
          </el-dialog>
        </div>

        <!-- 按钮区域 -->
        <div class="buttons-section">
          <div class="action-buttons">
            <el-button @click="tryAgain" class="action-button try-again">
              {{ $t("HandHygiene.tryagain") }}
            </el-button>
            <el-button @click="back" class="action-button home-button">
              <img src="../assets/homeIcon.png" class="home-icon" />
              {{ $t("HandHygiene.homepage") }}
            </el-button>
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
import { ElScrollbar, ElRate, ElDialog } from 'element-plus'
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

const value = ref(0); // 评分值，初始为 0
let dialogVisible = ref(false);
let disabledRating = ref(false); // 提交评分后禁用评分组件

// 打开评分对话框
const openDialog = () => {
  console.log("打开评分对话框");
  dialogVisible.value = true;
};
const uiRating = ref(0);
const trainingRating = ref(0);
const recommendRating = ref(0);
// 评分发生变化时触发（也可在提交按钮中统一处理）
const handleRatingChange = async (ratingType, newValue) => {
  console.log(`${ratingType} rating changed:`, newValue);
  // 根据 ratingType 更新对应的响应式变量（假设你已经定义了 uiRating, trainingRating, recommendRating）
  if (ratingType === 'ui') {
    uiRating.value = newValue;
  } else if (ratingType === 'training') {
    trainingRating.value = newValue;
  } else if (ratingType === 'recommend') {
    recommendRating.value = newValue;
  }
  // 可选：这里可以直接调用接口提交该评分
};

// 提交评分并保存到后端
const submitRating = async () => {
  try {
    console.log("提交评分:", value.value);
    const rank_id = sessionStorage.getItem("accountSerialNumber") || localStorage.getItem("accountSerialNumber");
    //console.log("提交评分rankid:", rank_id);
    //const rank_id = '67dd09578fc9261ce50ab805';
    // 调用 Vuex action 或直接调用后端 API 存储评分结果
    await store.dispatch("user/submitRating", {
      id: rank_id,
      rating: {
        ui: uiRating.value,
        training: trainingRating.value,
        recommend: recommendRating.value
      }
    });
ElNotification({
      title: "Thanks for Rating",
      type: "success",
    });
    dialogVisible.value = false;
  } catch (error) {
    console.error("评分提交失败:", error);
    ElNotification({
      title: "Rating Failed",
      type: "error",
    });
  }
};

// 对话框关闭前的处理（如需要确认或动画处理）
const handleClose = (done) => {
  // 如果需要处理确认逻辑可以在这里加，最终调用 done() 关闭对话框
  done();
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
    rankMessage.value = Math.floor(rankPercentage);
  }
  console.log(rankMessage.value); // Debug rankMessage value

  // Set the step correctness data from the backend response
  list.value = res?.step_points;
  
  // 设置用户总成绩，强制取整
  total.value = Math.floor(res?.userScore || 0);
  
  // Set the video file names for download from the backend response
  downloadVideoName.value = res?.step_video_files;

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
  padding: 0.5rem; /* 减小边距 */
  box-sizing: border-box;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  min-height: 90vh;
  position: relative;
  padding: 0.5rem;
}

/* 顶部区域样式 - 优化为单行 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 0.75rem; /* 减小底部间距 */
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem; /* 减小logo间距 */
}

.logo-image {
  width: auto;
  height: 3rem; /* 稍微减小logo尺寸 */
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
}

.locale-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0;
  
  @media (max-width: 480px) {
    width: auto;
    height: auto;
  }
}

/* 主要内容区域 */
.main-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 0.75rem; /* 减小垂直间距 */
  justify-content: flex-start; /* 改为顶部对齐 */
  margin-bottom: 0.75rem; /* 减小底部间距 */
}

/* 成就展示区域 */
.achievement-section {
  background-color: rgba(255, 255, 255, 0.5); /* 改为半透明白色背景 */
  border-radius: 16px;
  padding: 1rem; /* 减小内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.12);
  margin-bottom: 0.25rem;
  border: 1px solid rgba(15, 56, 124, 0.08);
}

.achievement-image {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem; /* 减小底部间距 */
  
  img {
    width: 120px; /* 减小图片尺寸 */
    height: 120px;
    border-radius: 50%;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border: 3px solid rgba(255, 255, 255, 0.8);
  }
}

.achievement-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.achievement-total {
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1.6rem;
  color: #0f387c;
  text-align: center;
  line-height: 1.4;
  
  .total-number {
    color: #ffcc00;
    font-size: 2rem;
    font-weight: 800;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
    display: inline-block;
    margin: 0 0.2rem;
  }
}

.achievement-rank {
  font-family: "Helvetica85", sans-serif;
  font-weight: 600;
  font-size: 1.75rem; /* 增大字体尺寸 */
  color: #0f387c;
  text-align: center;
  line-height: 1.3;
  
  .rank-number {
    color: #ffcc00;
    font-size: 2.2rem; /* 增大数字字体 */
    font-weight: 800;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
    display: inline-block;
    margin: 0 0.2rem;
  }
}

/* 步骤评分区域 */
.steps-review-section {
  background-color: rgba(255, 255, 255, 0.5); /* 改为半透明白色背景 */
  border-radius: 16px;
  padding: 0.75rem;
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.12);
  border: 1px solid rgba(15, 56, 124, 0.08);
}

.step-rating-container {
  width: 100%;
  padding: 0.25rem; /* 减小内边距 */
}

.step-row {
  display: flex;
  align-items: center;
  padding: 0.5rem; /* 减小内边距 */
  margin-bottom: 0.5rem; /* 减小底部间距 */
  background-color: #f2f6fc;
  border-radius: 12px;
  min-height: 3rem; /* 减小最小高度 */
  box-shadow: 0 2px 6px rgba(15, 56, 124, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(15, 56, 124, 0.12);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

.star-section {
  width: 2.5rem; /* 减小宽度 */
  display: flex;
  justify-content: center;
  align-items: center;
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
}

.step-star :deep(.el-rate__icon) {
  font-size: 2.25rem;
  margin-right: 0;
}

.comment-section {
  flex: 1;
  padding-left: 0.75rem; /* 减小左边距 */
}

.comment-content {
  display: flex;
  flex-direction: column;
}

.comment-title {
  font-weight: 700;
  color: #0f387c;
  font-size: 0.95rem; /* 减小字体尺寸 */
  margin-bottom: 0.25rem;
}

.comment-text {
  color: #4a5568;
  font-size: 0.85rem; /* 减小字体尺寸 */
  line-height: 1.3;
}

/* 评分区域 */
.rating-section {
  background-color: rgba(255, 255, 255, 0.5); /* 改为半透明白色背景 */
  border-radius: 16px;
  padding: 0.75rem; /* 减小内边距 */
  box-shadow: 0 6px 16px rgba(15, 56, 124, 0.12);
  border: 1px solid rgba(15, 56, 124, 0.08);
}

.rating-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1rem; /* 水平间距 */
  font-size: 1.15rem; /* 减小字体尺寸 */
  color: #0f387c;
  padding: 0.5rem; /* 减小内边距 */
  font-weight: 600;
  text-align: center;
  flex-wrap: wrap; /* 在小屏幕上可以换行 */
  
  :deep(.el-button) {
    font-size: 1rem;
    padding: 0.5rem 1.5rem; /* 减小按钮内边距 */
    font-weight: 600;
    background-color: #1a56db;
    border-color: #1a56db;
    
    &:hover {
      background-color: #1e429f;
      border-color: #1e429f;
    }
  }
}

.rating-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.rating-description {
  font-size: 1rem;
  color: #0f387c;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.custom-rate {
  display: flex;
  justify-content: center;
  transform: scale(1.1); /* 略微减小星星尺寸 */
  margin: 0.25rem 0;
}

/* 按钮区域 */
.buttons-section {
  margin-top: 0.5rem;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem; /* 减小按钮间距 */
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 0.5rem; /* 减小按钮内边距 */
  height: auto;
  background-image: url("../assets/button.png");
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  border: none;
  color: white;
  font-weight: 700;
  font-size: 1.1rem; /* 减小字体尺寸 */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  
  &.try-again {
    background-color: #2563eb;
  }
  
  &.home-button {
    background-color: #1a56db;
  }
  
  .home-icon {
    width: 1.5rem;
    height: 1.5rem;
    margin-right: 0.5rem;
  }
}

/* 响应式布局优化 */
@media (min-height: 900px) {
  .main-section {
    gap: 1rem;
  }
  
  .home-top {
    margin-top: 0.75rem;
    margin-bottom: 1rem;
  }
  
  /* 在高屏幕上恢复较大尺寸 */
  .achievement-image img {
    width: 140px;
    height: 140px;
  }
  
  .step-row {
    min-height: 3.5rem;
    padding: 0.75rem;
  }
}

@media (min-height: 700px) and (max-height: 899px) {
  .main-section {
    gap: 0.85rem;
  }
  
  .achievement-image img {
    width: 120px;
    height: 120px;
  }
}

/* 添加额外的超小屏幕优化 */
@media (max-height: 600px) {
  .home-top {
    margin-bottom: 0.5rem;
  }
  
  .main-section {
    gap: 0.5rem;
  }
  
  .achievement-section,
  .steps-review-section,
  .rating-section {
    padding: 0.5rem;
  }
  
  .achievement-image {
    margin-bottom: 0.5rem;
  }
  
  .achievement-image img {
    width: 90px;
    height: 90px;
  }
  
  .achievement-header {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .achievement-total {
    font-size: 1.3rem;
    
    .total-number {
      font-size: 1.6rem;
    }
  }
  
  .achievement-rank {
    font-size: 1.5rem;
    
    .rank-number {
      font-size: 1.8rem;
    }
  }
  
  .step-row {
    padding: 0.4rem;
    min-height: 2.5rem;
    margin-bottom: 0.4rem;
  }
  
  .star-section {
    width: 2rem;
  }
  
  .step-star img {
    width: 1.8rem;
    height: 1.8rem;
  }
  
  .comment-title {
    font-size: 0.85rem;
  }
  
  .comment-text {
    font-size: 0.75rem;
  }
  
  .rating-content {
    font-size: 1rem;
  }
  
  .action-button {
    padding: 0.5rem;
    font-size: 1rem;
  }
}
</style>

