<template>
  <div class="home">
    <div class="home-top">
      <div class="back-home">
        <div v-if="!HandHygiene">
          <img src="../assets/home.png" alt="" @click="backHome" />
        </div>
      </div>
      <select-locale :changeStyle="shouldChangeStyle"></select-locale>
    </div>
    <div v-if="HandHygiene">
      <div class="home-personal">REGISTRATION</div>
      <div class="home-input">
        <div class="home-input-studentID">
          <el-input
            v-model="studentID"
            placeholder="Student ID (Eg.22022222G)"
          />
        </div>
        <div class="home-input-select">
          <el-select
            v-model="department"
            class="selectOption"
            placeholder="Department"
          >
            <el-option
              v-for="item in DepartmentOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              class="custom-option"
            />
          </el-select>
        </div>
        <div class="home-input-select">
          <el-select
            v-model="programme"
            class="selectOption"
            placeholder="Programme"
          >
            <el-option
              v-for="item in programmeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              class="custom-option"
            />
          </el-select>
        </div>
        <div class="home-input-select">
          <el-select
            v-model="subject"
            class="selectOption"
            placeholder="Subject Code"
          >
            <el-option
              v-for="item in subjectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              class="custom-option"
            />
          </el-select>
        </div>
      </div>
      <div class="home-btn">
        <el-button @click="started">{{ $t("HandHygiene.btn") }}</el-button>
      </div>
    </div>
    <div v-if="!HandHygiene" class="agreeText">
      <div class="content">
        <div class="content-title">USER SERVICE AGREEMENT/DISCLAIMER</div>
        <div class="content-subTitle">
          <div style="margin-bottom: 15px">
            This User Service Agreement/Disclaimer ("Agreement") governs your
            use of the hand-washing application ("App") provided by the School
            of Nursing, The Hong Kong Polytechnic University. By accessing or
            using the App, you agree to be bound by the terms and conditions of
            this Agreement. If you do not agree with these terms, you should not
            use the App.
          </div>
          <div style="margin-bottom: 15px">
            App Purpose and Information: The App is designed to provide guidance
            and information on proper hand-washing methods based on a large
            number of hand-washing data from the real-world Hong Kong
            population. It aims to help users improve their hand-washing
            techniques and reduce the presence of bacteria on hands. The App
            does not guarantee complete eradication of bacteria or prevention of
            any diseases.
          </div>
          <div style="margin-bottom: 15px">
            User Responsibilities: By using the App, you acknowledge and agree
            to the following:
          </div>
          <div style="margin-bottom: 15px">
            a. Personal Responsibility: The App is intended to provide general
            information and guidance. It is your responsibility to use the App
            correctly and to exercise your judgment when interpreting and
            applying the information provided. The App does not replace
            professional medical advice or diagnosis.
          </div>
          <div style="margin-bottom: 15px">
            b. Individual Differences: The effectiveness of hand-washing methods
            may vary based on individual factors, such as skin conditions,
            personal hygiene habits, and overall health. The App does not
            consider these individual differences and should not be considered
            as a substitute for personalized advice from a healthcare
            professional.
          </div>
          <div style="margin-bottom: 15px">
            c. Limitations: While the App strives to provide accurate
            information, it may not always reflect the latest scientific
            research or developments in the field of hand hygiene. The App
            Provider does not guarantee the accuracy, completeness, or
            reliability of the information provided.
          </div>
          <div style="margin-bottom: 15px">
            d. User Conduct: You agree to use the App responsibly and in
            compliance with applicable laws and regulations. You shall not use
            the App in a manner that may infringe upon the rights of others or
            disrupt the functionality or security of the App.
          </div>

          <div style="margin-bottom: 15px">
            Limitation of Liability: To the maximum extent permitted by law, the
            App Provider and its affiliates, officers, directors, employees,
            agents, and licensors shall not be liable for any direct, indirect,
            incidental, consequential, or special damages arising out of or in
            connection with your use of the App, including but not limited to
            any loss of data, loss of profits, or business interruption.
          </div>
          <div style="margin-bottom: 15px">
            You acknowledge that your use of the App is at your own risk.
          </div>
          <div style="margin-bottom: 15px">
            Intellectual Property: The App and all its content, including but
            not limited to text, graphics, images, logos, and software, are the
            intellectual property of the App Provider or its licensors and are
            protected by copyright and other intellectual property laws. You may
            not modify, reproduce, distribute, or create derivative works based
            on the App or its content without prior written consent from the App
            Provider.
          </div>
          <div style="margin-bottom: 15px">
            Termination: The App Provider reserves the right to terminate or
            suspend your access to the App at any time without prior notice or
            liability if you violate the terms of this Agreement or engage in
            any unauthorized or inappropriate use of the App.
          </div>
          <div style="margin-bottom: 15px">
            Governing Law: This Agreement shall be governed by and construed in
            accordance with the laws of the jurisdiction where the App Provider
            is located, without regard to its conflict of laws principles.
          </div>
          <div style="margin-bottom: 15px">
            Modifications: The App Provider reserves the right to modify or
            update this Agreement at any time. Any changes to this Agreement
            will be effective immediately upon posting the revised version on
            the App. Your continued use of the App after the posting of any
            modifications constitutes your acceptance of the revised Agreement.
          </div>
          <div style="margin-bottom: 15px">
            By using the App, you acknowledge that you have read, understood,
            and agreed to be bound by this Agreement. If you do not agree to the
            terms and conditions of this Agreement, you should discontinue the
            use of the App.
          </div>
          <div style="margin-bottom: 15px">Last updated: June 8, 2024</div>
        </div>
        <div class="content-btn">
          <el-button @click="agree">AGREE</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import SelectLocale from "@/components/SelectLocale.vue";
import { ElNotification } from "element-plus";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { validateStudentID } from "../utils/formatData";
const store = useStore();
const router = useRouter();
const t = useI18n();
const department = ref("");
const programme = ref("");
const shouldChangeStyle = ref(false); // 默认不添加
const DepartmentOptions = [
  {
    value: "SN",
    label: "SN",
  },
  {
    value: "SO",
    label: "SO",
  },
  {
    value: "HTI",
    label: "HTI",
  },
  {
    value: "ABCT",
    label: "ABCT",
  },
  {
    value: "Others",
    label: "Others",
  },
];
const subject = ref("");
const programmeOptions = [
  {
    value: "BA(Hons)AASSM",
    label: "BA(Hons)AASSM",
  },
  {
    value: "BA(Hons)SW",
    label: "BA(Hons)SW",
  },
  {
    value: "BA(Hons)ASS (SW/SPSE)",
    label: "BA(Hons)ASS (SW/SPSE)",
  },
  {
    value: "BA(Hons)SPSE",
    label: "BA(Hons)SPSE",
  },
  {
    value: "BSc(Hons) MLS",
    label: "BSc(Hons) MLS",
  },
  {
    value: "BSc(Hons) Radiography",
    label: "BSc(Hons) Radiography",
  },
  {
    value: "BSc(Hons)OT",
    label: "BSc(Hons)OT",
  },
  {
    value: "BSc(Hons)PT",
    label: "BSc(Hons)PT",
  },
  {
    value: "BSc(Hons)Nursing",
    label: "BSc(Hons)Nursing",
  },
  {
    value: "BSc(Hons)MHN",
    label: "BSc(Hons)MHN",
  },
  {
    value: "BSc(Hons) Optometry",
    label: "BSc(Hons) Optometry",
  },
  {
    value: "BSc (Hons) in Vision Science + AIDA",
    label: "BSc (Hons) in Vision Science + AIDA",
  },
  {
    value: "BSc (Hons) in Vision Science + IE",
    label: "BSc (Hons) in Vision Science + IE",
  },
  {
    value: "BSc(Hons)BCT",
    label: "BSc(Hons)BCT",
  },
  {
    value: "BSc(Hons)ASTC",
    label: "BSc(Hons)ASTC",
  },
  {
    value: "Others",
    label: "Others",
  },
];
const subjectOptions = [
  {
    value: "JS3648",
    label: "JS3648",
  },
  {
    value: "JS3337",
    label: "JS3337",
  },
  {
    value: "52355-SY",
    label: "52355-SY",
  },
  {
    value: "ABCT1103",
    label: "ABCT1103",
  },
  {
    value: "SO4013",
    label: "SO4013",
  },
  {
    value: "SO4014",
    label: "SO4014",
  },
  {
    value: "Others",
    label: "Others",
  },
];
const studentID = ref("");
const HandHygiene = ref(true);
async function started() {
  try {
    if (!validateStudentID(studentID.value)) {
      ElNotification({
        title: "Format：8個數字＋1英文字母（d/g/r）",
        type: "error",
      });
      return;
    }
    const res = await store.dispatch("user/login", {
      ID: studentID.value,
      subject: subject.value,
      department: department.value,
      program: programme.value,
    });
    localStorage.setItem("studnetSerialNumber", studentID.value);
    sessionStorage.setItem("studnetSerialNumber", studentID.value);
    ElNotification({
      title: res.message,
      type: "success",
    });
    setTimeout(() => {
      HandHygiene.value = false;
    }, 1000);
  } catch (e) {
    console.log();
    ElNotification({
      title: "Network Error",
      type: "error",
    });
    studentID.value = "";
    subject.value = "";
    department.value = "";
  }
}
const agree = () => {
  router.push({
    path: "/detecting",
  });
};
const backHome = () => {
  HandHygiene.value = true;
  studentID.value = "";
  department.value = "";
  subject.value = "";
  localStorage.removeItem("studnetID");
  sessionStorage.removeItem("studnetID");
};
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.selectOption {
  font-family: "SourceHanSansCN";
  font-size: 26px;
}
.home {
  width: 100%;
  height: 100%;
  background-image: url("../assets/HandHygienebg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  &-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .back-home {
      width: 126px;
      height: 126px;
      margin-left: 41px;
      img {
        margin-top: 30px;
        width: 100%;
        height: 100%;
      }
    }
  }
  &-title {
    width: 692px;
    height: 203px;
    line-height: 70px;
    background-color: rgba(108, 108, 108, 0.27);
    color: rgba(16, 16, 16, 1);
    font-size: 48px;
    text-align: center;
    box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.4);
    font-family: Roboto;
    border: 1px solid rgba(187, 187, 187, 1);
    margin: 0 auto;
    &-font {
      color: rgba(33, 84, 118, 1);
      font-size: 72px;
      text-align: center;
      font-family: Roboto-regular;
      line-height: 101px;
    }
    &-logo {
      margin-top: -51px;
      img {
        width: 200px;
        height: 200px;
      }
    }
  }
  &-personal {
    text-align: center;
    margin-top: 380px;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 32px;
    color: #0f387c;
    line-height: 39px;
    text-align: center;
    font-style: normal;
    text-transform: none;
    @include devices(tablet) {
      margin-top: 300px;
    }
  }
  &-input {
    text-align: center;
    &-studentID {
      :deep(.el-input) {
        width: 626px;
        height: 90px;
        margin: 25px;
      }
      :deep(.el-input__wrapper) {
        background: #f5f8fd;
        border-radius: 26px 26px 26px 26px;
      }
      :deep(.el-input__inner) {
        font-family: "SourceHanSansCN";
        font-size: 26px;
        color: #b4c1d5;
        height: 60px;
      }
    }
    &-select {
      :deep(.el-input) {
        width: 626px;
        height: 90px;
      }
      :deep(.el-select) {
        width: 626px;
        height: 90px;
        margin: 25px;
        @include devices(tablet) {
          margin: 15px;
        }
      }
      :deep(.el-input__wrapper) {
        background: #f5f8fd;
        border-radius: 26px 26px 26px 26px;
      }
      :deep(.el-input__inner) {
        font-family: "SourceHanSansCN";
        font-size: 26px;
        color: #b4c1d5;
        height: 60px;
      }
      :deep(.el-input__suffix) {
        width: 53px;
        height: 53px;
      }
      :deep(.el-input__suffix-inner) {
        width: 53px;
        height: 53px;
        background-image: url("../assets/dropdown.png");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }
    }
  }
  &-btn {
    text-align: center;
    @include devices(tablet) {
      margin-top: 0px;
    }
    :deep(.el-button) {
      width: 626px;
      height: 100px;
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
    }
  }
}
.agreeText {
  margin-top: 400px;
  @include devices(tablet) {
    margin-top: 300px;
  }
}
.content {
  width: 90%;
  margin: 0 auto;
  overflow: auto;
  background: #ffffff;
  box-shadow: 18px 0 62px 0px #c8d4eb;
  border-radius: 19px 19px 19px 19px;
  &-title {
    margin-top: 24px;
    height: 40px;
    line-height: 25px;
    text-align: center;
    font-family: "Helvetica85";
    font-weight: 800;
    font-size: 32px;
    color: #0f387c;
    @include devices(tablet) {
      font-size: 20px;
    }
  }
  &-subTitle {
    height: 400px;
    overflow: auto;
    padding: 25px 25px 0px 25px;
    font-family: SourceHanSansCN, SourceHanSansCN;
    font-weight: 400;
    font-size: 20px;
    color: #a0b0c7;
    line-height: 29px;
    font-style: normal;
    text-transform: none;
  }
  &-btn {
    text-align: center;
    margin-top: 0px;
    margin-bottom: 10px;
    :deep(.el-button) {
      width: 626px;
      height: 118px;
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
    }
  }
}

.custom-option {
  color: rgba(108, 108, 108, 1);
  font-family: "SourceHanSansCN";
  font-size: 26px;
  height: 56px;
}
</style>
