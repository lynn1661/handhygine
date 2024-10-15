const server=require('micro-server');
server.start({projectDir:__dirname});

const express = require('express');
const cors = require('cors');
const app = express();

// 启用 CORS，允许来自所有源的请求
app.use(cors());

