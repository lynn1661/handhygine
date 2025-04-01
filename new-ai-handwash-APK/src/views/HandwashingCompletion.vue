<template>
  <div v-loading="loading" class="home">
    <div style="height: 20px"></div>
    <div class="home-div">
      <div class="home-top">
        <div class="logo">
          <img src="../assets/polyu-logo.png" alt="Logo 1" class="logo-image" />
          <img src="../assets/sn-logo.png" alt="Logo 2" class="logo-image" />
        </div>
        <select-locale :changeStyle="shouldChangeStyle"></select-locale>
      </div>
      <div class="home-svg">
        <div class="home-svg-img">
          <img v-if="showImg === 'Novice'" src="/public/Novice.png" alt="" />
          <img v-if="showImg === 'Pro'" src="/public/Pro.png" alt="" />
          <img v-if="showImg === 'Master'" src="/public/Master.png" alt="" />
        </div>
        <div class="home-title">{{ $t("HandHygiene.congrat1") }}</div>
        <!--<div class="home-title-vice">{{ $t("HandHygiene.congrat2") }}</div>-->
        <div class="home-title-rankbeatmessage">
          {{ $t("HandHygiene.rank1") }} 
          <span class="number">{{ rankMessage }}</span>
          {{ $t("HandHygiene.rank2") }}
        </div>
      </div>
    </div>
    <div class="home-content">
      <el-scrollbar height="440px" always>
        <div class="step-rating-container">
          <!-- 对 list 进行循环，每一项代表一个步骤 -->
          <div class="step-row" v-for="(item, index) in list" :key="index">
            <!-- 星级评分部分 -->
            <div class="star-section">
              <div class="home-content-star">
                <img
                  v-if="item.Step === 'PERFECT'"
                  src="/public/fullstar.png"
                  alt=""
                />
                <img
                v-else-if="item.Step === 'Need Improvement'"
                src="/public/nullstar.png"
                alt=""
                />
                <img
                  v-else-if="item.Step === 'GOOD'"
                src="/public/halfstar.png"
                  alt=""
                />
              </div>
            </div>
            <!-- 描述部分 -->
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
      <!--
      <div class="home-subContent">
        {{ $t("HandHygiene.thankyou") }}
      </div>-->
    </div>
    <div class="rating">
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
      
      <!-- 直接显示评分区域 
      <div class="rating-area">
        <el-rate
          v-model="value"
          size="large"
          :texts="['oops', 'disappointed', 'normal', 'good', 'great']"
          show-text
          text-color="#409EFF"
          active-color="#409EFF"
          void-color="#ccc"
        />
      </div>-->
      
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
    <div>
      <el-row class="home-btn">
        <el-col :span="10">
          <div>
            <el-button @click="tryAgain">
              <div style="height: 34px; line-height: 44px">
                {{ $t("HandHygiene.tryagain") }}
              </div></el-button>
          </div>
        </el-col>
        <el-col :span="11">
          <div>
            <el-button @click="back">
              <div style="margin-right: 10px">
                <img
                  src="../assets/homeIcon.png"
                  style="width: 34px; height: 34px"
                />
              </div>
              <div style="height: 34px; line-height: 44px">
                {{ $t("HandHygiene.homepage") }}
              </div></el-button
            >
          </div>
        </el-col>
      </el-row>
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
  list.value = res?.step_correctness;
  
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
    height: 45px;
    .logo {
      display: flex;
      align-items: center;
      margin-top: 25px;
    }
    .logo-image {
      width: auto;
      height: 60px;  
    }
  }
  &-div {
    background-image: url("../assets/divBG.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    margin: 0px 63px 23px 63px;
  }
  &-title {
    text-align: center;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 36px;
    color: #0f387c;
    font-style: normal;
    text-transform: none;
    margin-top: 12px;
    &-rankbeatmessage {
      text-align: center;
      font-family: "Helvetica85";
      font-weight: 800;
      font-size: 34px;
      color: #0f387c;
      height: 60px;
      line-height: 50px;

      .number{
        color: #ffcc00; //金色
        font-size: 42px; 
        font-weight: 900; 
      }
    }
  }
  &-svg {
    margin: 10px auto;
    &-img {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      img {
        width: 170px;
        height: 170px;
        border-radius: 50%;
      }
    }
  }
  &-content {
    background-color: #fff;
    margin: 0px 63px 0px 63px;
      .step-rating-container {
        width: 100%;
        margin: 15px auto;
        
        .step-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
          
          height: 50px;
          margin: 10px;
          text-align: left;
          border-radius: 4px;
          background: #F2F6FC;
          color: var(--el-color-primary-light-3);
        }

        .star-section {
          display: flex;
          align-items: center;
        }
        
        .home-content-star img {
          width: 40px;
          height: 40px;
        }
        
        .comment-section {
          flex: 1;
          padding-left: 15px;
        }
        
        .comment-content {
          font-size: 16px;
          //line-height: 1.4;
        }
        
        .comment-title {
          font-weight: 600;
          margin-right: 5px;
        }
        
        .comment-text {
          color: #909399;
        }
    }
  }
  &-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    margin-top: 15px;
    :deep(.el-button) {
      width: 80%;
      height: 100px;
      font-family: Helvetica85;
      font-weight: 700;
      font-size: 32px;
      color: #ffffff;
      line-height: 16px;
      font-style: normal;
      text-transform: none;
      border-radius: 26px 26px 26px 26px;
      background-image: url(../assets/button.png);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      margin-bottom: 20px;
    }
  }
}
.rating{
  background-color:#fff;
  margin: 0px 63px 0px 63px;
  padding: 10px;
  &-content {
    font-size: 24px;
    font-weight: 500; 
    text-align: center; 
    //margin-bottom: 5px;
    //margin-top: 10px;
    color: var(--el-color-primary-dark-2); 
    //line-height: 1.4;
  }
  &-btn {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  /*
  &-area {
    text-align: center; 
    margin: 0 auto; 
    transform: scale(1.6);
  }*/
}
.rating-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2px;
}

.rating-description {
  font-size: 16px;
  //font-weight: bold;
  color: #333;
  //margin-bottom: 2px;
  text-align: center;
}

.custom-rate {
  display: flex;
  justify-content: center;
}
</style>
