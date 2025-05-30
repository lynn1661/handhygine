#!/usr/bin/env python
"""
真实AI模型的Flask适配版本
基于原始的recognition.py，但适配为同步处理模式
"""
import sys
import argparse
import yaml
import numpy as np
import os
import logging
import importlib

# torch
import torch
import torch.nn as nn
import torch.optim as optim

logger = logging.getLogger('RealAI')

def str2bool(v):
    """字符串转布尔值"""
    if isinstance(v, bool):
        return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')

def import_class(name):
    """动态导入类"""
    components = name.split('.')
    mod = __import__(components[0])
    for comp in components[1:]:
        mod = getattr(mod, comp)
    return mod

def weights_init(m):
    classname = m.__class__.__name__
    if classname.find('Conv1d') != -1:
        m.weight.data.normal_(0.0, 0.02)
        if m.bias is not None:
            m.bias.data.fill_(0)
    elif classname.find('Conv2d') != -1:
        m.weight.data.normal_(0.0, 0.02)
        if m.bias is not None:
            m.bias.data.fill_(0)
    elif classname.find('BatchNorm') != -1:
        m.weight.data.normal_(1.0, 0.02)
        m.bias.data.fill_(0)

class RealREC_Processor:
    """
    真实AI模型处理器 - Flask同步版本
    基于原始的REC_Processor但简化为同步处理
    """

    def __init__(self, args=None):
        """初始化处理器"""
        self.args = args or []
        self.result = None
        self.model = None
        self.dev = self._get_device()
        self.model_loaded = False
        
        # 加载配置
        self.config_path = "./config/st_gcn/handwash/inference.yaml"
        self.config = self._load_config()
        
        # 初始化模型
        self._load_model()
        
        logger.info(f"真实AI模型处理器初始化完成，设备: {self.dev}")

    def _get_device(self):
        """获取计算设备"""
        if torch.cuda.is_available():
            return torch.device('cuda:0')
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return torch.device('mps')
        else:
            return torch.device('cpu')

    def _load_config(self):
        """加载配置文件"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = yaml.safe_load(f)
                logger.info(f"配置加载成功: {self.config_path}")
                return config
            else:
                logger.warning(f"配置文件不存在: {self.config_path}")
                return self._get_default_config()
        except Exception as e:
            logger.error(f"配置加载失败: {e}")
            return self._get_default_config()

    def _get_default_config(self):
        """获取默认配置"""
        return {
            'weights': './checkpoints/rot_norm/epoch1000_model.pt',
            'model': 'net.st_gcn.Model',
            'model_args': {
                'in_channels': 3,
                'num_class': 7,
                'edge_importance_weighting': True,
                'graph_args': {
                    'layout': 'hand_wash',
                    'strategy': 'spatial'
                }
            },
            'device': 0
        }

    def _load_model(self):
        """加载AI模型"""
        try:
            # 导入模型类
            Model = import_class(self.config['model'])
            
            # 创建模型实例
            self.model = Model(**self.config['model_args'])
            
            # 初始化权重
            self.model.apply(weights_init)
            
            # 加载预训练权重
            weights_path = self.config['weights']
            if os.path.exists(weights_path):
                logger.info(f"加载模型权重: {weights_path}")
                
                # 加载权重
                checkpoint = torch.load(weights_path, map_location=self.dev)
                
                # 处理不同的权重格式
                if isinstance(checkpoint, dict):
                    if 'model' in checkpoint:
                        state_dict = checkpoint['model']
                    elif 'state_dict' in checkpoint:
                        state_dict = checkpoint['state_dict']
                    else:
                        state_dict = checkpoint
                else:
                    state_dict = checkpoint
                
                # 加载权重到模型
                self.model.load_state_dict(state_dict, strict=False)
                logger.info("模型权重加载成功")
            else:
                logger.warning(f"权重文件不存在: {weights_path}")
            
            # 将模型移动到指定设备
            self.model = self.model.to(self.dev)
            
            # 设置为评估模式
            self.model.eval()
            
            self.model_loaded = True
            logger.info("真实AI模型加载完成")
            
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            import traceback
            traceback.print_exc()
            self.model_loaded = False

    def start(self, data_list):
        """
        开始推理处理
        
        Args:
            data_list: 输入数据列表
        """
        if not self.model_loaded:
            logger.error("模型未加载，无法进行推理")
            self.result = [np.array([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.6])]
            return self.result
        
        try:
            result_frag = []
            
            for data in data_list:
                # 转换数据类型并移动到设备
                if isinstance(data, np.ndarray):
                    data = torch.from_numpy(data).float().to(self.dev)
                else:
                    data = data.float().to(self.dev)
                
                # 进行推理
                with torch.no_grad():
                    output = self.model(data)
                
                # 转换结果并添加到列表
                result_frag.append(output.data.cpu().numpy())
            
            self.result = result_frag
            logger.info(f"推理完成，输出形状: {[r.shape for r in result_frag]}")
            
        except Exception as e:
            logger.error(f"推理过程出错: {e}")
            import traceback
            traceback.print_exc()
            # 返回默认结果
            self.result = [np.array([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.6])]
        
        return self.result

    def get_model_info(self):
        """获取模型信息"""
        return {
            "model_loaded": self.model_loaded,
            "model_type": "ST-GCN",
            "device": str(self.dev),
            "config_path": self.config_path,
            "weights_path": self.config.get('weights', 'Unknown'),
            "num_classes": self.config.get('model_args', {}).get('num_class', 7)
        }

    def reset(self):
        """重置处理器状态"""
        self.result = None
        logger.info("处理器状态已重置")

    def shutdown(self):
        """关闭处理器，释放资源"""
        if self.model is not None:
            del self.model
            self.model = None
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.model_loaded = False
        logger.info("处理器已关闭，资源已释放")

# 兼容性别名
REC_Processor = RealREC_Processor 