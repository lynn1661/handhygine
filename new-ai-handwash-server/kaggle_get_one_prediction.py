#!/usr/bin/env python3
import logging
import os

main_formatter = logging.Formatter(fmt='%(asctime)s - %(name)s - %(levelname)s - \n%(message)s\n',
                                   datefmt='%d-%m-%Y %H:%M:%S')
bl_formatter = logging.Formatter('%(message)s')

#Log
# 创建全局 logger，并配置 Handler
logger = logging.getLogger('Python data')
logger.setLevel(logging.INFO)

# 设置日志文件路径
log_file_path = os.path.join(r"/home/hhyg/new-ai-handwash-server", "log.txt")

# 添加 FileHandler 只一次
if not logger.handlers:
    fh = logging.FileHandler(log_file_path)
    fh.setLevel(logging.INFO)
    main_formatter = logging.Formatter(fmt='%(asctime)s - %(name)s - %(levelname)s - \n%(message)s\n', datefmt='%d-%m-%Y %H:%M:%S')
    fh.setFormatter(main_formatter)
    logger.addHandler(fh)

# 保存日志的函数
def save_log(message):
    logger.info("**************************************")
    logger.exception(message)
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
    3: 0.,
    4: 0.,
    5: 5.,
    6: 5.,
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
        action_list = {
            "ans": str(ans)
        }
    return action_list



sio = socketio.AsyncServer(cors_allowed_origins='*',async_mode='aiohttp')
app = web.Application()
sio.attach(app)

cors = aiohttp_cors.setup(app)
for resource in app.router._resources:
    if resource.raw_match("/socket.io/"):
        continue
    cors.add(resource,
    {
        '*': aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*")
    })

@sio.event
def connect(sid, environ):
    print(f"Client {sid} connected")
    save_log(f"Client {sid} connected")

@sio.event
def disconnect(sid):
    print(f"Client {sid} disconnected")
    save_log(f"Client {sid} disconnected")

async def index(request):
    with open('index.html') as f:
        return web.Response(text=f.read(), content_type='text/html')

@sio.on('log')
async def handle_log(sid, message):
    print(f"Received log from {sid}: {message}")  # 打印到控制台
    save_log(message)  # 保存日志到文件


@sio.on('message')
async def print_message(sid, message):

    current_step = message["step"]  # 提取当前步骤
    data = message["data"]  # 提取关键点数据
    print(f"Current step: {current_step}")  # 打印当前步骤
    print(f"Data: {data}")
    save_log(f"current_step {current_step}")

    # get key point information and video with skeleton
    keypoint_input = split_and_prep_frame(data)
    print(f"keypoint_input: {keypoint_input}")

    # load model and inference with the loaded model
    test_list = [keypoint_input]
    processor = REC_Processor(sys.argv[1:])
    processor.start(keypoint_input)

    print("processor.result", processor.result[0].shape)
    save_log(f"processor.result {processor.result}" )
    
    action_list = map_result_to_step(processor.result, current_step)
    print(f"action_list {action_list}")
    save_log(f"Send back message: {action_list}")
    await sio.emit('message', action_list)

app.router.add_get('/', index)


if __name__ == '__main__':
    web.run_app(app,port=9500)

