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
        <div class="home-title">CONGRATULATIONS!</div>
        <div class="home-title-vice">You have completed the test!</div>
        <div class="home-title-rankbeatmessage">{{ rankMessage }}</div>
      </div>
    </div>
    <div class="home-content">
      <div class="star">
        <div class="starImg" v-for="(item, index) in list">
          <div class="home-content-star">
            <img
              v-if="item.Step === 'PERFECT'"
              src="/public/fullstar.png"
              alt=""
            />
            <img
              v-if="item.Step === 'FAIL'"
              src="/public/nullstar.png"
              alt=""
            />
            <img
              v-if="item.Step === 'GOOD'"
              src="/public/halfstar.png"
              alt=""
            />
          </div>
          <div class="title">Step {{ index + 1 }}</div>
        </div>
      </div>
      <div style="margin-left: 53px; margin-right: 53px">
        <div class="commment">
          <div style="padding: 11px">
            <span style="font-weight: 600">Regular Reminders</span>
            <span class="setpTitle">
              : Set prompts for handwashing before meals, after the restroom,
              and when arriving home.</span
            >
          </div>
        </div>
        <div class="commment">
          <div style="padding: 11px">
            <span style="font-weight: 600">Thorough Washing</span>
            <span class="setpTitle">
              : Spend enough time on handwashing. Quick rinses don't effectively
              remove germs.</span
            >
          </div>
        </div>
        <div class="commment">
          <div style="padding: 11px">
            <span style="font-weight: 600">Nail Hygiene</span>
            <span class="setpTitle">
              : Clean under fingernails where germs often hide.</span
            >
          </div>
        </div>
      </div>
      <div class="home-subContent">
        Thank you for using our app to enhance your handwashing technique! Your
        health and safety are of utmost importance to us.
      </div>
      <div>
        <el-row class="home-btn">
          <el-col :span="12">
            <div>
              <el-button @click="tryAgain">
                <div style="height: 34px; line-height: 44px">
                  Try Again
                </div></el-button
              >
            </div>
          </el-col>
          <el-col :span="12">
            <div>
              <el-button @click="back">
                <div style="margin-right: 10px">
                  <img
                    src="../assets/homeIcon.png"
                    style="width: 34px; height: 34px"
                  />
                </div>
                <div style="height: 34px; line-height: 44px">
                  Home Page
                </div></el-button
              >
            </div>
          </el-col>
        </el-row>
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
const downloadVideo = () => {
  blobs.value.forEach((blobString, index) => {
    const link = document.createElement("a");
    link.href = blobString;
    link.download = `${downloadVideoName.value[index]}.mp4`;
    link.click();
  });
};
const list = ref();
const showImg = ref("");
const downloadName = ref();
const rankMessage = ref('');
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
  const id = sessionStorage.getItem("studnetID") || localStorage.getItem("studnetID");
  console.log("ID being sent: ", id);  // Debugging step
  const res = await store.dispatch("user/rank", { id });
  console.log("Response from get_rank:", res);  // Debugging step

  // Set the rank level (Novice, Pro, Master) from the backend response
  HandwashingType.value = res?.rankLevel;

  // Set the percentage of users beaten from the backend response
  const rankPercentage = res?.rankPercentage;

  // If a rank percentage is available, display a message showing the percentage
  if (rankPercentage !== undefined) {
    rankMessage.value = `You have beaten ${Math.floor(rankPercentage)}% of users!`;
  }
  console.log(rankMessage.value); // Debug rankMessage value

  // Set the step correctness data from the backend response
  list.value = res?.step_correctness;

  // Set the video file names for download from the backend response
  downloadVideoName.value = res?.step_video_files;

  // Count the number of steps marked as "true" and adjust the rank image
  const trueCount = Array.isArray(list.value) ? list.value.reduce(
    (count, step) => count + (step.Step ? 1 : 0),
    0
  ) : 0;

  // Update the rank image based on the number of correct steps
  if (trueCount >= 0 && trueCount <= 3) {
    showImg.value = "Novice";
  } else if (trueCount >= 4 && trueCount <= 6) {
    showImg.value = "Pro";
  } else if (trueCount === 7) {
    showImg.value = "Master";
  }

  // Trigger the video download process
  downloadVideo();
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
    font-size: 39px;
    color: #0f387c;
    font-style: normal;
    text-transform: none;
    margin-top: 12px;
    @include devices(tablet) {
      margin-top: 12px;
      font-size: 36px;
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
        width: 200px;
        height: 200px;
        @include devices(tablet) {
          width: 200px;
          height: 200px;
        }
        border-radius: 50%;
      }
    }
  }
  &-content {
    background-color: #fff;
    margin: 0px 63px 0 63px;
    border-radius: 19px 19px 19px 19px;
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
      }
    }
  }
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
  &-btn {
    display: flex;
    justify-content: space-around;
    align-items: center;
    text-align: center;
    margin-top: 20px;
    :deep(.el-button) {
      width: 95%;
      height: 117px;
      font-family: Helvetica85;
      font-weight: 800;
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
}
</style>
