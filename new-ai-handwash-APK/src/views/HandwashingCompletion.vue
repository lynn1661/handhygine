<template>
  <div v-loading="loading" class="home">
    <div style="height: 20px"></div>
    <div class="home-div">
      <div class="home-top">
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
      <el-scrollbar height="600px" always>
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
      </div>
      <!-- 直接显示评分区域 -->
      <div class="rating-area">
        <el-rate
          v-model="value"
          size="large"
          :texts="['oops', 'disappointed', 'normal', 'good', 'great']"
          show-text
          text-color="#ff9900"
        />
      </div>
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
const value = ref();
const store = useStore();
const router = useRouter();
const loading = ref(true);
const t = useI18n();
const shouldChangeStyle = ref(true); // 默认不添加
const HandwashingType = ref();
const back = () => {
  localStorage.removeItem("studnetID");
  sessionStorage.removeItem("studnetID");
  localStorage.removeItem("studnetSerialNumber");
  sessionStorage.removeItem("studnetSerialNumber");
  store.commit("user/clearVideoBlob");
  router.push({
    path: "/",
  });
};
const tryAgain = () => {
  router.push({
    path: "/detecting",
  });
};

const blobs = computed(() => {
  return store.state.user.blobs;
});
const downloadVideoName = ref();
// const downloadVideo = async () => {
//   for (let i = 0; i < blobs.value.length; i++) {
//     const blobString = blobs.value[i];
//     const fileName = `${downloadVideoName.value[i]}.mp4`;
//     await saveVideoToGallery(blobString, fileName);
//   }
// };
async function saveVideoToGallery(videoData, fileName) {
  // try {
  //   const result = await Filesystem.writeFile({
  //     path: fileName,
  //     data: videoData,
  //     directory: Directory.Documents,
  //     recursive: true,
  //   });
  //   console.log("视频已保存到相册:", result.uri);
  // } catch (error) {
  //   console.error("保存视频到相册时出错:", error);
  // }
}
const list = ref();
const showImg = ref("");
const downloadName = ref();
const rankMessage = ref("");
onMounted(async () => {
  // Get the download name for the video based on the student's serial number
  downloadName.value = getTime(
    sessionStorage.getItem("studnetSerialNumber") ||
      localStorage.getItem("studnetSerialNumber")
  );

  // Set a 2-second timeout to disable the loading state
  setTimeout(() => {
    loading.value = false;
  }, 2000);

  // Dispatch the 'rank' action to retrieve the user's ranking data from the store
  const id =
    sessionStorage.getItem("studnetID") || localStorage.getItem("studnetID");
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

  // 注释掉下载视频的调用
  // downloadVideo();
  // ElNotification({
  //   title: "视频已保存到相册",
  //   type: "success",
  // });
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
    justify-content: flex-end;
    align-items: center;
    height: 30px;
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
    @include devices(tablet) {
      margin-top: 12px;
      font-size: 33px;
    }
    &-vice {
      text-align: center;
      font-family: "Helvetica85";
      font-weight: 800;
      font-size: 21px;
      color: #0f387c;
      height: 50px;
      line-height: 50px;
    }
    &-rankbeatmessage {
      text-align: center;
      font-family: "Helvetica85";
      font-weight: 800;
      font-size: 28px;
      color: #0f387c;
      height: 50px;
      line-height: 50px;

      .number{
        color: #ffcc00; //金色
        font-size: 34px; 
        font-weight: 900; 
      }
    }
  }
  &-svg {
    margin: 0 auto;
    &-img {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      img {
        width: 150px;
        height: 150px;
        @include devices(tablet) {
          width: 150px;
          height: 150px;
        }
        border-radius: 50%;
      }
    }
  }
  &-content {
    background-color: #fff;
    margin: 0px 63px 0px 63px;
    // border-radius: 19px 19px 19px 19px;
    /*
    .star {
      display: flex;
      justify-content: space-around;
      align-items: center;
      margin: 0px 52px 36px 52px;
      @include devices(tablet) {
        margin: 0px 52px 10px 52px;
      }
    }
    .starImg {
      margin-top: 20px;
      @include devices(tablet) {
        margin-top: 20px;
      }
      .home-content-star {
        width: 85px;
        height: 82px;
        @include devices(tablet) {
          width: 65px;
          height: 65px;
        }
        img {
          width: 85px;
          height: 82px;
          @include devices(tablet) {
            width: 65px;
            height: 65px;
          }
        }
      }
      .title {
        font-family: "SourceHanSansCN";
        font-weight: 500;
        font-size: 25px;
        color: #07214b;
        line-height: 30px;
        text-align: center;
        font-style: normal;
        text-transform: none;
        margin-top: 10px;
      }*/
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
  /*
  &-subContent {
    margin-left: 59px;
    margin-right: 59px;
    font-family: "SourceHanSansCN";
    font-weight: 400;
    font-size: 22px;
    color: #bbc5d5;
    line-height: 28px;
    text-align: left;
    font-style: normal;
    text-transform: none;
    @include devices(tablet) {
      margin-left: 55px;
      margin-right: 55px;
    }
  }
  */
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
  &-content {
    font-size: 24px;
    font-weight: 500; 
    text-align: center; 
    margin-bottom: 5px;
    //margin-top: 10px;
    color: var(--el-color-primary-dark-2); 
    line-height: 1.4;
  }
  &-area {
    text-align: center; 
    margin: 0 auto; 
    transform: scale(1.6);
  }
}
/*
.commment {
  background: #f7f7f7;
  border-radius: 19px 19px 19px 19px;
  font-family: "SourceHanSansCN";
  font-weight: 500;
  font-size: 25px;
  color: #07214b;
  line-height: 28px;
  text-align: left;
  font-style: normal;
  text-transform: none;
  margin-bottom: 23px;
  @include devices(tablet) {
    font-size: 18px;
    margin-bottom: 10px;
  }
}
.setpTitle {
  font-size: 21px;
  @include devices(tablet) {
    font-size: 18px;
  }
}*/

</style>
