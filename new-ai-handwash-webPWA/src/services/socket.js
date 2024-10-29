import { io } from "socket.io-client";
let socket = null;
let res = null;
export function createConnect(message) {
  if (!socket) {
    socket = io("https://realtime.handhyine.com");
    socket.on("connect", () => {
      console.log("Socket connected");
      socket.on("message", (data) => {
        res = data;
      });
    });
    // 监听错误事件
    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected:"+ reason);
    });
  }
  try {
    JSON.stringify(message);  // 验证是否能被序列化为 JSON
    socket.emit('message', message);  // 发送消息
  } catch (error) {
    console.error("Invalid JSON data", error);
}
  return res;
}

export function handleData(data) {
  return data;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
