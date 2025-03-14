# 使用官方 Miniconda 镜像作为基础镜像
FROM continuumio/miniconda3:latest

# 安装 OpenCV 依赖库 libGL
RUN apt-get update && apt-get install -y libgl1-mesa-glx

# 设置工作目录
WORKDIR /app

# 复制 Conda 环境配置文件到容器中
COPY environment.yml .

# 根据 environment.yml 创建 Conda 环境（假设环境名称为 new-ai-handwash）
RUN conda env create -f environment.yml

# 复制项目代码到容器中
COPY . .

# 设置环境变量，将新创建的 Conda 环境加入 PATH
ENV PATH /opt/conda/envs/new-ai-handwash/bin:$PATH

# 安装项目内的 torchlight，模拟激活虚拟环境后在 torchlight 目录下运行 pip install .
RUN pip install /app/torchlight

# 暴露后端服务的端口（例如 9500）
EXPOSE 9500

# 设置容器启动时执行的命令
CMD ["python", "kaggle_get_one_prediction.py", "-c", "config/st_gcn/handwash/inference.yaml"]
