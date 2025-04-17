import axios from "axios";
import router from "./../router";
const axiosInstance = axios.create({ 
  baseURL: "https://backend2.polyuhandhygiene.com",
  timeout: 1000 * 20,
});

axiosInstance.interceptors.request.use((config) => {
  let reqData = {};
  if (config.headers["Content-Type"] === "multipart/form-data") {
    reqData = config.data;
  } else {
    reqData = {
      data: { ...config.data },
    };
  }
  return {
    ...config,
    data: reqData,
  };
});

axiosInstance.interceptors.response.use((response) => {
  const resData = response.data ?? {};
  // console.log("api response:", resData);
  if (resData.success === false) {
    const error = new Error(resData.data?.message ?? "unknown error");
    error.code = resData.data?.code;
    throw error;
  } else {
    response.data = resData.data;
  }
  return response;
});

export default axiosInstance;
