import io from "socket.io-client";
let socket;
const textContainer = document.getElementById("textContainer");
export function createConnect(message) {
  if (message == null) {
    textContainer.textContent = "unknown";
    return;
  } else if (message != null) {
    if (!socket) {
      socket = io("https://realtime.handhyine.com", {
        reconnection: true, // 允许重新连接
        reconnectionAttempts: Infinity, // 尝试无限次重新连接
      });

      socket.on("connect", () => {
        console.log("Socket connected");
        socket.on("message", (data) => {
          handleData(data);
        });
      });
      // 监听错误事件
      socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
      });
      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:" + reason);
      });
    }
    console.log('Sending message to server:', message);
    socket.emit("message", message);
  }
}

function handleData(data) {
  textContainer.textContent = "step :" + data.step;
  // const probabilitiesList = document.getElementById("probabilitiesList");
  // probabilitiesList.innerHTML = ""; // 清空列表内容，以防重复添加

  // data.probabilities.forEach((probability) => {
  //   const listItem = document.createElement("li");
  //   listItem.textContent = probability;
  //   probabilitiesList.appendChild(listItem);
  // });
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
