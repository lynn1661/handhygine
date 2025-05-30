#!/usr/bin/env python3
import logging
import os
import json
import sys
import threading
import multiprocessing as mp
from concurrent.futures import ThreadPoolExecutor
import time
import asyncio
import numpy as np
import socketio
from aiohttp import web
import aiohttp_cors

# 配置日志
main_formatter = logging.Formatter(
    fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt='%d-%m-%Y %H:%M:%S')

logger = logging.getLogger('Python data')
logger.setLevel(logging.INFO)

log_file_path = "log.txt"
if not logger.handlers:
    fh = logging.FileHandler(log_file_path)
    fh.setLevel(logging.INFO)
    fh.setFormatter(main_formatter)
    logger.addHandler(fh)

def save_log(message):
    logger.info("**************************************")
    logger.info(message)
    logger.info("**************************************\n\n")

# 导入处理模块
from processor.recognition import REC_Processor

# 创建模型处理器池 - 预加载多个模型实例
class ModelPool:
    def __init__(self, size=2):  # 默认创建2个模型实例
        self.pool = []
        self.lock = threading.Lock()
        self.size = size
        
        # 预加载模型
        print(f"初始化模型池，大小: {size}")
        for _ in range(size):
            processor = REC_Processor(sys.argv[1:])
            self.pool.append({"processor": processor, "in_use": False})
        print("模型池初始化完成")
        
    def get_processor(self):
        with self.lock:
            # 查找空闲的处理器
            for item in self.pool:
                if not item["in_use"]:
                    item["in_use"] = True
                    return item
                    
            # 如果没有空闲处理器，创建新的
            print("所有处理器都在使用，创建新处理器")
            processor = REC_Processor(sys.argv[1:])
            new_item = {"processor": processor, "in_use": True}
            self.pool.append(new_item)
            return new_item
    
    def release_processor(self, item):
        with self.lock:
            item["in_use"] = False

# 创建线程池和模型池
thread_pool = ThreadPoolExecutor(max_workers=4)  # 4个工作线程
model_pool = ModelPool(size=2)  # 2个预加载模型

# 阈值设置
step_threshold = {
    1: 1., 2: 1., 3: 0., 4: 0., 5: 4., 6: 4., 7: -2.
}

# 处理数据的函数
def get_hand_key_point(data):
    # 数据处理代码保持不变
    num_channels = 3
    num_hand_in = 4
    num_hand_out = 2
    key_point_number = 21
    
    key_point_numpy = np.zeros((num_channels, key_point_number, num_hand_in))
    score_numpy = np.zeros(num_hand_in)
        
    for index, side in enumerate(data):
        keypoints3D = data[side][0]["keypoints"]
        score_numpy[index] = data[side][0]["score"]
        
        for number, point in enumerate(keypoints3D):
            key_point_numpy[0, number, index] = point['x']
            key_point_numpy[1, number, index] = point['y']
            key_point_numpy[2, number, index] = point['z']

    sort_index = (-score_numpy).argsort()
    key_point_numpy[:, :, :] = key_point_numpy[:, :, sort_index]
    key_point_numpy = key_point_numpy[:, :, 0:num_hand_out]
    key_point_numpy = np.concatenate((key_point_numpy[:,:,0:1], key_point_numpy[:,:,1:2]), axis=-2)
    
    return key_point_numpy

def split_and_prep_frame(input):
    keypoint_list = []
    
    for i in input:
        key_points = get_hand_key_point(i)
        keypoint_list.append(key_points)
        
    keypoint_tensor = np.stack(keypoint_list, axis=1) 
    keypoint_input = []
    keypoint_input.append(keypoint_tensor[np.newaxis,:])
    
    return keypoint_input

def map_result_to_step(action_results, step):
    action_list = []
    
    for _action_result in action_results:
        _action_result = _action_result[0]
        action_result = np.zeros_like(_action_result)
        action_result[:-1] = _action_result[1:]
        action_result[-1] = _action_result[0]

        cur_prob = action_result[step-1]
        ans = True if cur_prob > step_threshold[step] else False
        action_list = {
            "ans": str(ans)
        }
    return action_list

# 异步处理数据的函数
async def process_data(data, current_step, request_id=None):
    # 将耗时操作放在线程池中执行
    def process_in_thread():
        try:
            start_time = time.time()
            print(f"开始处理请求 {request_id}, 步骤 {current_step}")
            
            # 获取处理器
            model_item = model_pool.get_processor()
            processor = model_item["processor"]
            
            try:
                # 预处理数据
                keypoint_input = split_and_prep_frame(data)
                
                # 使用模型进行推理
                processor.start(keypoint_input)
                
                # 映射结果
                result = map_result_to_step(processor.result, current_step)
                
                # 添加请求ID
                if request_id:
                    result["requestId"] = request_id
                    
                print(f"请求 {request_id} 处理完成，耗时: {time.time() - start_time:.2f}秒")
                return result
            finally:
                # 释放处理器
                model_pool.release_processor(model_item)
        except Exception as e:
            print(f"处理请求 {request_id} 时出错: {str(e)}")
            return {"error": str(e), "requestId": request_id}
    
    # 在线程池中执行耗时操作
    return await asyncio.get_event_loop().run_in_executor(
        thread_pool, process_in_thread)

# 创建Socket.IO服务器
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="aiohttp",
    ping_timeout=30,
    ping_interval=10
)

app = web.Application()
sio.attach(app)

# 记录客户端活动
client_last_active = {}

# 设置CORS
cors = aiohttp_cors.setup(app)
for resource in app.router._resources:
    if resource.raw_match("/socket.io/"):
        continue
    cors.add(resource, 
    { 
        '*': aiohttp_cors.ResourceOptions(
            allow_credentials=True, 
            expose_headers="*", 
            allow_headers="*"
        ) 
    })

# Socket.IO事件处理
@sio.event
async def connect(sid, environ):
    print(f"客户端 {sid} 已连接")
    save_log(f"客户端 {sid} 已连接")
    client_last_active[sid] = asyncio.get_event_loop().time()

@sio.on("log")
async def handle_log(sid, data):
    level = data.get("level", "info").upper()
    message = data.get("message", "")

    if level == "ERROR":
        logger.error(f"前端日志 [{sid}]: {message}")
    elif level == "WARNING":
        logger.warning(f"前端日志 [{sid}]: {message}")
    else:
        logger.info(f"前端日志 [{sid}]: {message}")

@sio.on('message')
async def handle_message(sid, message):
    print(f"收到来自 {sid} 的消息")
    save_log(f"收到来自 {sid} 的消息")

    # 更新活动时间
    client_last_active[sid] = asyncio.get_event_loop().time()

    # 提取数据
    current_step = message.get("step")
    data = message.get("data")
    request_id = message.get("requestId")
    
    print(f"当前步骤: {current_step}, 请求ID: {request_id}")
    save_log(f"current_step {current_step}, requestId {request_id}")

    # 异步处理数据
    result = await process_data(data, current_step, request_id)
    
    # 发送结果回客户端
    print(f"发送结果: {result}")
    save_log(f"发送结果: {result}")
    await sio.emit('message', result, room=sid)

@sio.event
async def disconnect(sid, *args):
    print(f"客户端 {sid} 已断开连接")
    save_log(f"客户端 {sid} 已断开连接")
    client_last_active.pop(sid, None)

# 监控不活跃客户端
async def monitor_inactive_clients():
    while True:
        await asyncio.sleep(30)
        now = asyncio.get_event_loop().time()
        inactive_clients = [
            sid for sid, last_active in client_last_active.items() 
            if now - last_active > 60
        ]

        for sid in inactive_clients:
            print(f"客户端 {sid} 已超过60秒不活跃，断开连接...")
            await sio.disconnect(sid)
            client_last_active.pop(sid, None)

# 主函数
async def main():
    # 启动监控任务
    asyncio.create_task(monitor_inactive_clients())
    return app

# 添加路由
async def index(request):
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return web.Response(text=f.read(), content_type="text/html")
    else:
        return web.Response(text="Index page not found", status=404)

app.router.add_get('/', index)

# 入口点
if __name__ == '__main__':
    print("启动服务器...")
    web.run_app(main(), port=9500)