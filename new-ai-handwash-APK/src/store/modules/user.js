import { updateRole as createSession, append_rating, get_rank } from "@/services/HandHygiene.js";

export default {
  namespaced: true,
  state: {
    userID: "",
    role: "",
    blobs: [],
    performanceMetrics: {
      jitterReduction: 0,
      occlusionPredictionAccuracy: 0,
      occlusionSmoothness: 0,
      trajectoryMatchRate: 0,
      frameRate: 0,
      keyPointDetectionCount: {
        raw: {},
        filtered: {}
      },
      stepAccuracy: {}
    }
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
    setPerformanceMetrics(state, metrics) {
      state.performanceMetrics = { ...metrics };
    },
    resetPerformanceMetrics(state) {
      state.performanceMetrics = {
        jitterReduction: 0,
        occlusionPredictionAccuracy: 0,
        occlusionSmoothness: 0,
        trajectoryMatchRate: 0,
        frameRate: 0,
        keyPointDetectionCount: {
          raw: {},
          filtered: {}
        },
        stepAccuracy: {}
      };
    }
  },
  actions: {
    async updateRole({ commit }, payload) {
      try {
        const { data } = await createSession(payload);
        if (payload.role) {
          commit("setUserRole", payload.role);
        }
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async rating({ commit }, payload) {
      try {
        // 将id重命名为sessionID以匹配后端API
        const requestData = { 
          sessionID: payload.id,
          points: payload.points,
          rating: payload.rating
        };
        const { data } = await append_rating(requestData);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    async rank({ commit }, payload) {
      try {
        // 将id重命名为sessionID以匹配后端API
        const requestData = { sessionID: payload.id };
        const { data } = await get_rank(requestData);
        return data;
      } catch (error) {
        console.log(error);
      }
    },
  },
};
