<template>
  <div>
    <div
      :class="{
        'home-change': props.changeStyle,
        'home-select': !props.changeStyle,
      }"
    >
      <el-select v-model="$i18n.locale">
        <el-option
          v-for="locale in $i18n.availableLocales"
          :key="`locale-${locale}`"
          :label="$t(`languages.${locale.replace('-', '_')}`)"
          :value="locale"
          class="custom-option"
        ></el-option>
      </el-select>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
const props = defineProps({
  changeStyle: Boolean,
});
</script>
<style lang="scss" scoped>
.home-select {
  display: flex;
  justify-content: flex-end;
  margin-right: 28px;

  :deep(.el-select) {
    margin-top: 54px;
  }
  :deep(.el-input) {
    width: 161px;
    height: 63px;
  }
  :deep(.el-input__inner) {
    width: 76px;
    font-family: MicrosoftYaHei;
    font-size: 22px;
    color: #ffffff;
    line-height: 35px;
    text-align: left;
    font-style: normal;
    text-transform: none;
  }
  :deep(.el-input__wrapper) {
    background: none;
    border-radius: 6px 6px 6px 6px;
    border: 2px solid #ffffff;
  }
  :deep(.el-input__suffix) {
    width: 44px;
    height: 44px;
  }
  :deep(.el-input__suffix-inner) {
    width: 44px;
    height: 44px;
    background-image: url("../assets/change.png");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    i {
      display: none;
    }
  }
}
.custom-option {
  font-size: 21px; /* 更改字体大小 */
  height: 30px;
}
.home-change {
  display: flex;
  justify-content: flex-end;
  margin-right: 28px;

  :deep(.el-select) {
    margin-top: 54px;
  }
  :deep(.el-input) {
    width: 161px;
    height: 63px;
  }
  :deep(.el-input__inner) {
    width: 76px;
    font-family: MicrosoftYaHei;
    font-size: 22px;
    color: #0e78f7;
    line-height: 35px;
    text-align: left;
    font-style: normal;
    text-transform: none;
  }
  :deep(.el-input__wrapper) {
    background: none;
    border-radius: 6px 6px 6px 6px;
    border: 1px solid #0e78f7;
  }
  :deep(.el-input__suffix) {
    width: 44px;
    height: 44px;
  }
  :deep(.el-input__suffix-inner) {
    width: 44px;
    height: 44px;
    background-color: #0e78f7; /* 添加背景颜色 */
    background-image: url("../assets/change.png");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    i {
      display: none;
    }
  }
}
</style>
