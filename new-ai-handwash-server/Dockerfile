# 使用官方 Python 镜像作为基础镜像（支持多架构）
FROM python:3.10-slim

# 安装系统依赖库
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 requirements.txt 到容器中
COPY requirements.txt .

# 安装 Python 依赖包
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目代码到容器中
COPY . .

# 安装项目内的 torchlight
RUN pip install /app/torchlight

# 暴露后端服务的端口
EXPOSE 9501

# 设置容器启动时执行的命令
CMD ["python", "kaggle_get_one_prediction.py", "-c", "config/st_gcn/handwash/inference.yaml"]
