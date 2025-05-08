import axios from "axios";
import router from "./../router";

console.log('创建Axios实例，当前环境:', process.env.NODE_ENV);

// 根据环境判断使用哪个baseURL
const getBaseURL = () => {
  // 开发环境也指向远程服务器的相对路径
  // 因为实际服务运行在EC2上，本地只是开发UI
  if (process.env.NODE_ENV === 'development') {
    // 使用相对路径，通过Vite代理转发到远程服务器
    return "/api/backend";
  }
  
  // 在测试环境中（如果有）
  if (process.env.NODE_ENV === 'test') {
    return "https://trainingtest.polyuhandhygiene.com/api/backend";
  }
  
  // 在生产环境中使用相对路径
  return "/api/backend"; // 相对路径，将通过Nginx转发
};

const axiosInstance = axios.create({ 
  baseURL: getBaseURL(),
  timeout: 1000 * 20,
  withCredentials: true, // 启用跨域请求时发送凭证
});

console.log('Axios baseURL:', axiosInstance.defaults.baseURL);

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
