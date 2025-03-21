import axiosInstance from "@/utils/axiosInstance";

export async function userLogin(params) {
  return axiosInstance.post("/user/info/login", {
    ...params,
  });
}export async function updateRole(params) {
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
