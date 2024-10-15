import { io } from "socket.io-client";
let socket = null;
let res = null;
export function createConnect(message) {
  if (!socket) {
    socket = io("https://handhygine.handhyine.com");
    socket.on("connect", () => {
      console.log("Socket connected");
      socket.on("message", (data) => {
        res = data;
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }
  socket.emit("message", message);
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
