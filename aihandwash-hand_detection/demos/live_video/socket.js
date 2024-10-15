import io from "socket.io-client";
let socket;
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // 设置允许的前端源地址（允许所有源）
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (message) => {
    console.log('Received message:', message);
    socket.emit('message', { step: 'success', probabilities: [0.9, 0.1] });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});
const textContainer = document.getElementById("textContainer");
export function createConnect(message) {
  if (message == null) {
    textContainer.textContent = "unknown";
    return;
  } else if (message != null) {
    if (!socket) {
      socket = io("https://handhygine.handhyine.com", {
        reconnection: true, // 允许重新连接
        reconnectionAttempts: Infinity, // 尝试无限次重新连接
      });

      socket.on("connect", () => {
        console.log("Socket connected");
        socket.on("message", (data) => {
          handleData(data);
        });
      });
      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });
    }
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
