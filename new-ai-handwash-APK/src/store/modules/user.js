import { userLogin, updateRole, append_rating, get_rank, getRankList } from "@/services/HandHygiene.js";

export default {
  namespaced: true,
  state: {
    userID: "",
    role: "",
    blobs: [],
  },
  mutations: {
    updateUserID(state, payload) {
      state.userID = payload;
    },
    setUserRole(state, role) {
      state.role = role;
    },
    addBlob(state, payload) {
      state.blobs.push(payload);
    },
    clearVideoBlob(state) {
      state.blobs = [];
    },
  },
  actions: {
    async login({ commit }, payload) {
      try {
        const { data } = await userLogin(payload);
        commit("updateUserID", data.ID);
        localStorage.setItem("studentID", data.ID);
        sessionStorage.setItem("studentID", data.ID);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async updateRole({ commit }, payload) {
      try {
        const { data } = await updateRole(payload);
        commit("setUserRole", payload.role);
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
    async ranklist({ commit }, payload) {
      try {
        const { data } = await getRankList(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
  },
};
