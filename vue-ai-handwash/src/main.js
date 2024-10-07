import { createApp } from "vue";
import ElementUI from "element-plus";
import "element-plus/dist/index.css";
import i18n from "./lang";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./styles/main.scss";
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
