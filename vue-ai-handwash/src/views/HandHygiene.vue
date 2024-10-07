<template>
  <div class="home">
    <select-locale></select-locale>
    <div class="home-title">
      <div class="home-title-font">{{ $t("HandHygiene.title") }}</div>
      <div class="home-title-logo">LOGO</div>
    </div>
    <div v-if="HandHygiene">
      <div class="home-personal">{{ $t("HandHygiene.personal") }}</div>
      <div class="home-input">
        <div class="home-input-studentID">
          <el-input
            v-model="studentID"
            :placeholder="$t('HandHygiene.studentID')"
          />
        </div>
        <div class="home-input-select">
          <el-select
            v-model="department"
            class="m-2"
            placeholder="Department"
            size="large"
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
            v-model="subject"
            class="m-2"
            placeholder="Subject Code"
            size="large"
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
    <div v-if="!HandHygiene" style="margin-top: 50px">
      <div class="content">
        <div class="content-title">
          User Service Agreement/Disclaimer for Hand-Washing App
        </div>
        <div class="content-subTitle">
          <div style="margin-bottom: 25px">
            This User Service Agreement/Disclaimer ("Agreement") governs your
            use of the hand-washing application ("App") provided by [App
            Provider]. By accessing or using the App, you agree to be bound by
            the terms and conditions of this Agreement. If you do not agree with
            these terms, you should not use the App.
          </div>
          <div style="margin-bottom: 25px">
            App Purpose and Information: The App is designed to provide guidance
            and information on proper hand-washing methods based on a large
            number of hand-washing data from the real-world Hong Kong
            population. It aims to help users improve their hand-washing
            techniques and reduce the presence of bacteria on hands. The App
            does not guarantee complete eradication of bacteria or prevention of
            any diseases.
          </div>
          <div>
            User Responsibilities: By using the App, you acknowledge and agree
            to the following: a. Personal Responsibility: The App is intended to
            provide general information and guidance. It is your responsibility
            to use the App correctly and to exercise your judgment when
            interpreting and applying the information provided. The App does not
            replace professional medical advice or diagnosis. b. Individual
            Differences: The effectiveness of hand-washing methods may vary
            based on individual factors, such as skin conditions, personal
            hygiene habits, and overall health. The App does not consider these
            individual differences and should not be considered as a substitute
            for personalized advice from a healthcare professional.
          </div>
          <div>
            c. Limitations: While the App strives to provide accurate
            information, it may not always reflect the latest scientific
            research or developments in the field of hand hygiene. The App
            Provider does not guarantee the accuracy, completeness, or
            reliability of the information provided. d. User Conduct: You agree
            to use the App responsibly and in compliance with applicable laws
            and regulations. You shall not use the App in a manner that may
            infringe upon the rights of others or disrupt the functionality or
            security of the App.
          </div>
          <div style="margin-bottom: 25px">
            Limitation of Liability: To the maximum extent permitted by law, the
            App Provider and its affiliates, officers, directors, employees,
            agents, and licensors shall not be liable for any direct, indirect,
            incidental, consequential, or special damages arising out of or in
            connection with your use of the App, including but not limited to
            any loss of data, loss of profits, or business interruption.
          </div>
          <div style="margin-bottom: 25px">
            You acknowledge that your use of the App is at your own risk.
          </div>
          <div style="margin-bottom: 25px">
            Intellectual Property: The App and all its content, including but
            not limited to text, graphics, images, logos, and software, are the
            intellectual property of the App Provider or its licensors and are
            protected by copyright and other intellectual property laws. You may
            not modify, reproduce, distribute, or create derivative works based
            on the App or its content without prior written consent from the App
            Provider.
          </div>
          <div style="margin-bottom: 25px">
            Termination: The App Provider reserves the right to terminate or
            suspend your access to the App at any time without prior notice or
            liability if you violate the terms of this Agreement or engage in
            any unauthorized or inappropriate use of the App.
          </div>
          <div style="margin-bottom: 25px">
            Governing Law: This Agreement shall be governed by and construed in
            accordance with the laws of the jurisdiction where the App Provider
            is located, without regard to its conflict of laws principles.
          </div>
          <div style="margin-bottom: 25px">
            Modifications: The App Provider reserves the right to modify or
            update this Agreement at any time. Any changes to this Agreement
            will be effective immediately upon posting the revised version on
            the App. Your continued use of the App after the posting of any
            modifications constitutes your acceptance of the revised Agreement.
          </div>
          <div style="margin-bottom: 25px">
            By using the App, you acknowledge that you have read, understood,
            and agreed to be bound by this Agreement. If you do not agree to the
            terms and conditions of this Agreement, you should discontinue the
            use of the App.
          </div>
          Last updated: [Date]
        </div>
      </div>
      <div class="content-btn">
        <el-button @click="agree">Agree</el-button>
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
const store = useStore();
const router = useRouter();
const t = useI18n();
const department = ref("");

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
    value: "NA",
    label: "NA",
  },
  {
    value: "Others",
    label: "Others",
  },
];
const studentID = ref("12345678A");
const HandHygiene = ref(true);
async function started() {
  try {
    const res = await store.dispatch("user/login", {
      ID: studentID.value,
      subject: subject.value,
      department: department.value,
    });
    ElNotification({
      title: res.message,
      type: "success",
    });
    setTimeout(() => {
      HandHygiene.value = false;
    }, 1000);
  } catch (e) {
    ElNotification({
      title: e,
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
</script>
<style lang="scss" scoped>
@import "@/styles/main.scss";
.home {
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
      line-height: 101px;
    }
  }
  &-personal {
    margin-top: 140px;
    color: rgba(33, 84, 118, 0.74);
    font-size: 50px;
    text-align: center;
    font-family: Roboto-regular;
    @include devices(tablet) {
      margin-top: 30px;
      font-size: 40px;
    }
  }
  &-input {
    text-align: center;
    margin-top: 32px;
    @include devices(tablet) {
      margin-top: 10px;
    }
    &-studentID {
      :deep(.el-input) {
        width: 626px;
        height: 90px;
        margin: 25px;
      }
      :deep(.el-input__wrapper) {
        border: 1px solid rgba(187, 187, 187, 1);
        border-radius: 11px;
      }
      :deep(.el-input__inner) {
        font-size: 28px;
        color: rgba(136, 136, 136, 1);
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
      }
      :deep(.el-input__wrapper) {
        border: 1px solid rgba(187, 187, 187, 1);
        border-radius: 11px;
      }
      :deep(.el-input__inner) {
        font-size: 36px;
        color: rgba(136, 136, 136, 1);
      }
    }
  }
  &-btn {
    text-align: center;
    margin-top: 125px;
    @include devices(tablet) {
      margin-top: 20px;
    }
    :deep(.el-button) {
      width: 414px;
      height: 140px;
      border-radius: 28px;
      background-color: rgba(64, 149, 229, 0.89);
      color: rgba(255, 255, 255, 1);
      font-size: 50px;
    }
  }
}
.content {
  background-color: #ffffff;
  width: 90%;
  height: 894px;
  border: 1px solid black;
  margin: 0 auto;
  overflow: auto;
  @include devices(air) {
    height: 760px;
  }
  @include devices(tablet) {
    height: 520px;
  }
  &-title {
    margin-top: 24px;
    height: 40px;
    line-height: 39px;
    color: rgba(0, 0, 0, 1);
    font-size: 26px;
    font-weight: 700;
    text-align: center;
    @include devices(air) {
      font-size: 24px;
    }
    @include devices(tablet) {
      font-size: 20px;
    }
  }
  &-subTitle {
    line-height: 20px;
    color: rgba(16, 16, 16, 1);
    font-size: 18px;
    font-weight: 400;
    padding: 25px;
  }
  &-btn {
    margin-top: 22px;
    text-align: center;
    :deep(.el-button) {
      width: 255px;
      height: 92px;
      line-height: 51px;
      border-radius: 10px;
      background-color: rgba(64, 149, 229, 0.85);
      color: rgba(255, 255, 255, 1);
      font-size: 28px;
      text-align: center;
    }
  }
}

.custom-option {
  color: rgba(108, 108, 108, 1);
  font-size: 36px; /* 更改字体大小 */
  height: 56px;
}
</style>
