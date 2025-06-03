import axiosInstance from "@/utils/axiosInstance";

export async function userLogin(params) {
  return axiosInstance.post("/user/info/login", {
    ...params,
  });
}

export async function userRegister(params) {
  return axiosInstance.post("/user/info/register", {
    ...params,
  });
}

export async function updateRole(params) {
  return axiosInstance.post("/user/info/fill", {
    ...params,
  });
}

//每次洗手传递
export async function append_rating(params) {
  return axiosInstance.post("/data/record/append_rating", {
    ...params,
  });
}

export async function get_rank(params) {
  return axiosInstance.post("/data/record/get_rank", {
    ...params,
  });
}

export async function getRankList(params) {
  return axiosInstance.post("/data/rank/getRankList", {
    ...params,
  });
}

export async function getAllRank(params) {
  return axiosInstance.post("/data/rank/getAllRank", {
    ...params,
  });
}

export async function submitRating(params) {
  return axiosInstance.post("/data/rate/rating", {
    ...params,
  });
}

// 新增API函数，获取所有用户的评分反馈数据
export function getAllRatings(data) {
  return axiosInstance.post("/data/rate/get_ratings", {
    ...data,
  });
}
