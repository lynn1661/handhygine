import { createStore } from "vuex";
import user from "./modules/user.js";
const store = createStore({
  state() {
    return {};
  },
  mutations: {},
  modules: {
    user,
  },
});

export default store;
