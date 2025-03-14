#!/usr/bin/env python3
import logging
import os

main_formatter = logging.Formatter(
    fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt='%d-%m-%Y %H:%M:%S')
bl_formatter = logging.Formatter('%(message)s')

#Log

# 创建全局 logger，并配置 Handler
logger = logging.getLogger('Python data')
logger.setLevel(logging.INFO)

# 设置日志文件路径
log_file_path = "log.txt"

# 添加 FileHandler 只一次
if not logger.handlers:
    fh = logging.FileHandler(log_file_path)
    fh.setLevel(logging.INFO)
    main_formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt='%d-%m-%Y %H:%M:%S')
    fh.setFormatter(main_formatter)
    logger.addHandler(fh)

# 保存日志的函数
def save_log(message):
    logger.info("**************************************")
    logger.info(message)
    logger.info("**************************************\n\n")

from datetime import datetime
import json
import sys
from pprint import pprint

import cv2
import eventlet
import mediapipe as mp
import numpy as np
import socketio
import asyncio
from aiohttp import web
import aiohttp_cors
from scipy.special import softmax

from processor.recognition import REC_Processor

# make sure to provide correct paths to the folders on your machine   
interpolation='bilinear'
num_channels = 3
num_hand_in = 4
num_hand_out = 2
key_point_number = 21


def get_hand_key_point(data):
    # For static images:

        key_point_numpy = np.zeros((num_channels, key_point_number, num_hand_in))
        score_numpy = np.zeros(num_hand_in) # mofidy the order of skeleton according to the score for each hand
        
            
        for index, side in enumerate(data):
            keypoints3D = data[side][0]["keypoints"]
            score_numpy[index] = data[side][0]["score"]
            
            for number, point in enumerate(keypoints3D):
                key_point_numpy[0, number, index] = point['x']
                key_point_numpy[1, number, index] = point['y']
                key_point_numpy[2, number, index] = point['z']

        sort_index = (-score_numpy).argsort()

        key_point_numpy[:, :, :] = key_point_numpy[:, :, sort_index] #not understand transpose C*T*V*M to V*T*M*C
        
        key_point_numpy = key_point_numpy[:, :, 0:num_hand_out]
        key_point_numpy=np.concatenate((key_point_numpy[:,:,0:1],key_point_numpy[:,:,1:2]),axis=-2)
        return key_point_numpy

def split_and_prep_frame(input):
    keypoint_list = []
    
    for i in input:
        key_points = get_hand_key_point(i)
        keypoint_list.append(key_points)
        
    keypoint_tensor = np.stack(keypoint_list, axis = 1) 
    
    # concate key point array along time axis
    keypoint_input = []
    
    keypoint_input.append(keypoint_tensor[np.newaxis,:])
    
    return keypoint_input

# this helper function is to map the result through steps, since the 0 index is step 7
def sort_list(prob_list:list):
    temp=prob_list[0]
    copy=prob_list[1:]
    copy.append(temp)
    return copy

step_threshold = {
    1: 1. ,
    2: 1. ,
    3: 0. ,
    4: 0. ,
    5: 4. ,
    6: 4. ,
    7: -2.
}

def map_result_to_step(action_results, step):
    action_list = []
    
    for _action_result in action_results:
        _action_result = _action_result[0]
        action_result = np.zeros_like(_action_result)
        action_result[:-1]=_action_result[1:]
        action_result[-1]=_action_result[0]

        cur_prob = action_result[step-1]
        if cur_prob > step_threshold[step]:
            ans = True
        else:
            ans = False
        # action_list= {
        #     "step":label,
        #     "probabilities":sorted_list
        # }
        action_list = {
            "ans": str(ans)
        }
    return action_list

# creates a new Async Socket IO Server
#sio = socketio.AsyncServer(cors_allowed_origins='*',async_mode='aiohttp')
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="aiohttp",
    ping_timeout=30,  # 30 秒内未收到心跳则断开
    ping_interval=10  # 每 10 秒发送一次心跳检测
)
# Creates a new Aiohttp Web Application
app = web.Application()
# Binds our Socket.IO server to our Web App instance
sio.attach(app)

# 记录客户端的最后活动时间
client_last_active = {}

cors = aiohttp_cors.setup(app)
for resource in app.router._resources:
    if resource.raw_match("/socket.io/"):
        continue
    cors.add(resource, 
    { 
        '*': aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*") 
    })

# 监听 socket.io 连接
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")
    save_log(f"Client {sid} connected")
    client_last_active[sid] = asyncio.get_event_loop().time()  # 记录连接时间

# index.html
async def index(request):
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return web.Response(text=f.read(), content_type="text/html")
    else:
        return web.Response(text="Index page not found", status=404)
# 处理前端日志
@sio.on("log")
async def handle_log(sid, data):
    print(f"Received log from frontend: {data}")
    level = data.get("level", "info").upper()
    message = data.get("message", "")

    if level == "ERROR":
        logger.error(f"Frontend log [{sid}]: {message}")
    elif level == "WARNING":
        logger.warning(f"Frontend log [{sid}]: {message}")
    else:
        logger.info(f"Frontend log [{sid}]: {message}")

@sio.on('message')
async def print_message(sid, message):
    print(f"Received message from {sid}")
    save_log(f"Received message from {sid}")

    # 记录该客户端的最近活动时间
    client_last_active[sid] = asyncio.get_event_loop().time()

    current_step = message["step"]  # 提取当前步骤
    data = message["data"]  # 提取关键点数据
    print(f"Current step: {current_step}")  # 打印当前步骤
    print(f"Data: {data}")
    save_log(f"current_step {current_step}")

    # get key point information and video with skeleton
    keypoint_input = split_and_prep_frame(data)
    print(f"keypoint_input: {keypoint_input}")
    print(f"keypoint_input shape: {len(keypoint_input)} {keypoint_input[0].shape}")
    
    # load model and inference with the loaded model
    processor = REC_Processor(sys.argv[1:])
    processor.start(keypoint_input)

    # save_log(f"processor.result {processor.result}" )
    # print("processor.result", processor.result[0].shape)
    action_list = map_result_to_step(processor.result, current_step)
    print(f"action_list {action_list}")
    save_log(f"action_list {action_list}")
    await sio.emit('message', action_list)
    save_log(f"Send back message: {action_list}")

# 监听 socket.io 断开
@sio.event
async def disconnect(sid, *args):
    print(f"Client {sid} disconnected")
    save_log(f"Client {sid} disconnected")
    client_last_active.pop(sid, None)  # 移除该客户端的记录

# 定期检查客户端超时任务
async def monitor_inactive_clients():
    while True:
        await asyncio.sleep(30)  # 每 30 秒检查一次
        now = asyncio.get_event_loop().time()
        inactive_clients = [sid for sid, last_active in client_last_active.items() if now - last_active > 60]

        for sid in inactive_clients:
            print(f"Client {sid} inactive for 60s, disconnecting...")
            await sio.disconnect(sid)
            client_last_active.pop(sid, None)  # 移除该客户端的记录

# 服务器启动时，运行超时检查任务
async def main():
    asyncio.create_task(monitor_inactive_clients())  # 创建后台任务
    return app

app.router.add_get('/', index)

if __name__ == '__main__':
    web.run_app(main(), port=9500)
