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
  margin-right: 0;

  :deep(.el-select) {
    margin-top: 0;
  }
  :deep(.el-input) {
    width: 120px;
    height: auto;
  }
  :deep(.el-input__inner) {
    width: auto;
    font-family: MicrosoftYaHei;
    font-size: 16px;
    color: #0f387c;
    font-weight: 200;
    line-height: 24px;
    text-align: left;
    font-style: normal;
    text-transform: none;
  }
  :deep(.el-input__wrapper) {
    background: none;
    border-radius: 6px;
    border: 2px solid #0f387c;
    padding: 0 8px;
  }
  :deep(.el-input__suffix) {
    width: 32px;
    height: 32px;
  }
  :deep(.el-input__suffix-inner) {
    width: 32px;
    height: 32px;
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
  font-size: 16px;
  height: 30px;
}
.home-change {
  display: flex;
  justify-content: flex-end;
  margin-right: 0;

  :deep(.el-select) {
    margin-top: 0;
  }
  :deep(.el-input) {
    width: 120px;
    height: auto;
  }
  :deep(.el-input__inner) {
    width: auto;
    font-family: MicrosoftYaHei;
    font-size: 16px;
    color: #0f387c;
    font-weight: 600;
    line-height: 24px;
    text-align: left;
    font-style: normal;
    text-transform: none;
  }
  :deep(.el-input__wrapper) {
    background: none;
    border-radius: 6px;
    border: 2px solid #0f387c;
    padding: 0 8px;
  }
  :deep(.el-input__suffix) {
    width: 32px;
    height: 32px;
  }
  :deep(.el-input__suffix-inner) {
    width: 32px;
    height: 32px;
    background-color: #0f387c;
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
