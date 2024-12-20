import { io } from "socket.io-client";
let socket = null;
let res = null;
export function createConnect(message, currentStep) {
  if (!socket) {
    socket = io("https://ai.handhyine.com");
    socket.on("connect", () => {
      console.log("Socket connected");
      socket.on("message", (data) => {
        res = data;
        console.log('Received data from server:', data);
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
  const payload = { data: message, step: currentStep };
  socket.emit('message', payload);

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
