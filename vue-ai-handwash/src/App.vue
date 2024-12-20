<template>
  <!-- <nav>
    <router-link to="/hands">hands</router-link>
  </nav> -->
  <router-view></router-view>
</template>
<script setup>
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
const t = useI18n();

detectWebsiteLanguage();
function detectWebsiteLanguage() {
  const targetLanguage = (
    localStorage.getItem("websiteLanguage") || navigator.language
  ).toLowerCase();

  // Get 'en' from 'en-US' etc
  const targetLanguageShortForm = targetLanguage.slice(0, 1);

  const availableLanguage = t.availableLocales;

  // Check if target language in available languages list
  const targetLanguageIndex = availableLanguage.indexOf(
    targetLanguage.toLowerCase()
  );

  if (targetLanguageIndex !== -1) {
    t.locale.value = targetLanguage;
  } else {
    switch (targetLanguageShortForm) {
      case "en":
        t.locale.value = targetLanguageShortForm;
        break;
      case "zh":
        t.locale.value = "zh-cn";
        break;
      default:
        t.locale.value = "en";
    }
  }
}
</script>
<style>
</style>
