import { userLogin, append_rating, get_rank } from "@/services/HandHygiene.js";

export default {
  namespaced: true,
  state: {
    userID: "",
  },
  mutations: {
    updateUserID(state, payload) {
      state.userID = payload;
    },
  },
  actions: {
    async login({ commit }, payload) {
      try {
        const { data } = await userLogin(payload);
        commit("updateUserID", data.ID);
        localStorage.setItem("studnetID", data.ID);
        sessionStorage.setItem("studnetID", data.ID);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async rating({ commit }, payload) {
      try {
        const { data } = await append_rating(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async rank({ commit }, payload) {
      try {
        const { data } = await get_rank(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
  },
};
