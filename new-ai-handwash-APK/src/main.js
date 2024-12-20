import { createApp } from "vue";
import ElementUI from "element-plus";
import "element-plus/dist/index.css";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./styles/main.scss";
import { mapKeys } from "lodash";
const localeModules = import.meta.glob("./i18n/locales/*.json", {
  eager: true,
  import: "default",
});
const messages = mapKeys(localeModules, (_, k) => {
  return k.match(/locales\/(.+)\.json/)[1];
});
const i18n = createI18n({
  locale: "en",
  legacy: false,
  fallbackLocale: "en",
  globalInjection: true,
  messages,
});
const app = createApp(App);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});

app.use(i18n);
app.use(store);
app.use(router);
app.use(ElementUI);
app.mount("#app");
