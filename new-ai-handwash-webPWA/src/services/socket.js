import { io } from "socket.io-client";
import { deflate } from "pako";
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
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:"+ reason);
    });
  }
  try {
    const jsonMessage = JSON.stringify(message);  // 验证是否能被序列化为 JSON
    const compressedData = deflate(jsonMessage); //压缩 JSON 字符串
    socket.emit('message', compressedData);  // 发送消息
    console.log('Compressed message sent:', compressedData);
  } catch (error) {
    console.error("Invalid JSON data", error);
    socket.emit('message', message);  // 发送消息
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
