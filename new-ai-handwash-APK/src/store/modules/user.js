import { userLogin, updateRole, append_rating, get_rank, getRankList, getAllRank, submitRating } from "@/services/HandHygiene.js";

export default {
  namespaced: true,
  state: {
    userID: "",
    role: "",
    blobs: [],
  },
  mutations: {
    updateAccountID(state, payload) {
      state.accountID = payload;
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
        commit("updateAccountID", data.accountID);
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
        console.log("Payload in ranklist action:", payload);
        const { data } = await getRankList(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async allrank({ commit }, payload) {
      try {
        console.log("Payload in allrank action:", payload);
        const { data } = await getAllRank(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async submitRating({ commit }, payload) {
      try {
        console.log("Payload", payload);
        const { data } = await submitRating(payload);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
  },
};
