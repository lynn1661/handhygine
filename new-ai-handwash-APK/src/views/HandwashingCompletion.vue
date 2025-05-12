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

      <!-- 主要内容区域 - 固定布局 -->
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

        <!-- 右侧：步骤评分列表和评分区域 -->
        <div class="right-column">
          <!-- 步骤评分列表 -->
          <div class="steps-review-section">
            <el-scrollbar height="380px" always>
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
        </div>
      </div>

      <!-- 按钮区域 - 在所有视图中保持底部 -->
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
  min-height: auto; /* 移除最小高度限制，避免内容过高需要滚动 */
  position: relative;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  box-shadow: none; /* 移除阴影效果 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  
  @media (min-width: 768px) {
    &:hover {
      box-shadow: none; /* 移除悬浮时的阴影效果 */
      transform: none; /* 移除悬浮时的上移效果 */
    }
  }
}

/* 顶部区域样式 */
.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 1.5rem;
  //margin-bottom: 1rem;
  //border-bottom: 1px solid rgba(15, 56, 124, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.logo-image {
  width: auto;
  height: 3rem;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  
  &:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  }
  
  @media (max-width: 480px) {
    height: 2.25rem;
  }
  
  @media (min-width: 768px) {
    height: 4rem;
  }
}

.locale-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
    width: auto;
    height: auto;
  }
}

/* 主要内容区域 - 固定布局 */
.main-section {
  display: flex;
  flex-direction: row; /* 始终保持水平布局 */
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  gap: 2rem;
  justify-content: flex-start;
  margin-bottom: 1.5rem;
  align-items: stretch;
}

/* 左栏样式 */
.left-column {
  width: 45%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* 右栏样式 */
.right-column {
  width: 55%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 成就展示区域 */
.achievement-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 20px;
  padding: 2rem;
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
    padding: 2.5rem;
    height: 100%;
    justify-content: center;
  }
}

.achievement-image {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
  
  &::after {
    content: '';
    position: absolute;
    width: 140%;
    height: 30px;
    background: radial-gradient(ellipse at center, rgba(15, 56, 124, 0.1) 0%, rgba(15, 56, 124, 0) 70%);
    bottom: -30px;
    border-radius: 50%;
    left: -20%;
    z-index: -1;
  }
  
  img {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
    border: 4px solid rgba(255, 255, 255, 0.9);
    position: relative;
    z-index: 2;
    transition: transform 0.5s ease, box-shadow 0.5s ease;
    
    &:hover {
      transform: scale(1.05) rotate(5deg);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
    }
    
    @media (min-width: 768px) {
      width: 200px;
      height: 200px;
      border-width: 5px;
    }
  }
}

.achievement-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
}

.achievement-total {
  font-family: "Helvetica85", sans-serif;
  font-weight: 700;
  font-size: 1.8rem;
  color: #0f387c;
  text-align: center;
  line-height: 1.4;
  position: relative;
  padding-bottom: 1rem;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #ffcc00, #ff9900);
    border-radius: 2px;
  }
  
  .total-number {
    color: #ff9900;
    font-size: 2.5rem;
    font-weight: 800;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    display: inline-block;
    margin: 0 0.3rem;
  }
  
  @media (min-width: 768px) {
    font-size: 2.2rem;
    
    .total-number {
      font-size: 3rem;
    }
  }
}

.achievement-rank {
  font-family: "Helvetica85", sans-serif;
  font-weight: 600;
  font-size: 1.8rem;
  color: #0f387c;
  text-align: center;
  line-height: 1.3;
  margin-top: 0.5rem;
  
  .rank-number {
    color: #ff9900;
    font-size: 2.2rem;
    font-weight: 800;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    display: inline-block;
    margin: 0 0.3rem;
  }
  
  @media (min-width: 768px) {
    font-size: 2.2rem;
    
    .rank-number {
      font-size: 2.6rem;
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

/* 按钮区域 */
.buttons-section {
  margin-top: 1rem;
  width: 100%;
  position: relative;
  margin-bottom: 0.5rem; /* 确保底部有足够空间 */
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    max-width: 700px;
    margin: 0 auto;
  }
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1rem;
  height: auto;
  background-image: url("../assets/button.png");
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  border: none;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;
  max-width: 220px;
  position: relative;
  overflow: hidden;
  
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
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    
    &::before {
      opacity: 1;
      animation: shine 1.5s;
    }
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
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
  
  @media (min-width: 768px) {
    font-size: 1.2rem;
    padding: 1.25rem 1.5rem;
    
    .home-icon {
      width: 1.75rem;
      height: 1.75rem;
    }
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
</style>

