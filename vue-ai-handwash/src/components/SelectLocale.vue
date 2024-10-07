<template>
  <div class="home">
    <div class="home-select">
      <el-select v-model="$i18n.locale">
        <el-option
          v-for="locale in $i18n.availableLocales"
          :key="`locale-${locale}`"
          :label="$t(`${locale.replace('-', '_')}`)"
          :value="locale"
          class="custom-option"
        ></el-option>
      </el-select>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
</script>
<style lang="scss" scoped>
.home {
  &-select {
    display: flex;
    justify-content: flex-end;
    margin-right: 21px;

    :deep(.el-select) {
      margin-top: 18px;
    }
    :deep(.el-input) {
      width: 168px;
      height: 56px;
    }
    :deep(.el-input__inner) {
      color: rgba(55, 127, 127, 1);
      font-size: 36px;
    }
  }
}
.custom-option {
  font-size: 36px; /* 更改字体大小 */
  height: 56px;
}
</style>
