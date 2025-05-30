from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sqlite3
import datetime
import uuid
import json
from werkzeug.exceptions import BadRequest
import traceback
import time

# 导入服务模块
from services.user_service import UserService
from services.rate_service import RateService
from services.rank_service import RankService
from services.database_service import DatabaseService
from services.handwash_detection_service import HandwashDetectionService

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用跨域请求

# 配置
app.config['DATABASE'] = './data/handwash.db'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# 初始化数据库服务
db_service = DatabaseService(app.config['DATABASE'])

# 初始化其他服务
user_service = UserService(db_service)
rate_service = RateService(db_service)
rank_service = RankService(db_service)

# 初始化洗手检测服务
# 可以通过环境变量控制是否使用真实模型
import os
use_real_model = os.getenv('USE_REAL_MODEL', 'true').lower() == 'true'
handwash_service = HandwashDetectionService(db_service, use_real_model=use_real_model)

# 健康检查和状态端点
@app.route('/', methods=['GET'])
def index():
    """主页和状态检查"""
    return jsonify({
        'message': '洗手检测服务器运行中 (Flask版本)',
        'status': 'online',
        'database': 'SQLite',
        'mode': 'offline-ready',
        'timestamp': datetime.datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health():
    """健康检查端点"""
    try:
        stats = db_service.get_stats()
        return jsonify({
            'status': 'healthy',
            'database': stats,
            'timestamp': datetime.datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat()
        }), 500

# 用户服务API
@app.route('/services/user/login', methods=['POST'])
def user_login():
    """用户登录"""
    try:
        data = request.get_json()
        result = user_service.login(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/user/register', methods=['POST'])
def user_register():
    """用户注册"""
    try:
        data = request.get_json()
        result = user_service.register(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/user/getUserInfo', methods=['POST'])
def get_user_info():
    """获取用户信息"""
    try:
        data = request.get_json()
        result = user_service.get_user_info(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/user/updateUserInfo', methods=['POST'])
def update_user_info():
    """更新用户信息"""
    try:
        data = request.get_json()
        result = user_service.update_user_info(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

# 评分服务API
@app.route('/services/data/rating', methods=['POST'])
def rating():
    """提交评分"""
    try:
        data = request.get_json()
        result = rate_service.submit_rating(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/data/getUserRatings', methods=['POST'])
def get_user_ratings():
    """获取用户评分历史"""
    try:
        data = request.get_json()
        result = rate_service.get_user_ratings(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/data/getStats', methods=['POST'])
def get_stats():
    """获取统计信息"""
    try:
        result = rate_service.get_stats()
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

# 排名服务API
@app.route('/services/data/getRankings', methods=['POST'])
def get_rankings():
    """获取排名"""
    try:
        data = request.get_json()
        result = rank_service.get_rankings(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/data/getUserRank', methods=['POST'])
def get_user_rank():
    """获取用户排名"""
    try:
        data = request.get_json()
        result = rank_service.get_user_rank(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

@app.route('/services/data/getDeviceRankings', methods=['POST'])
def get_device_rankings():
    """获取设备排名"""
    try:
        data = request.get_json()
        result = rank_service.get_device_rankings(data)
        return jsonify(result)
    except Exception as e:
        return handle_error(e)

# 洗手分析API端点（替换原来的Socket通信）
@app.route('/api/handwash/analyze', methods=['POST'])
def handwash_analyze():
    """洗手动作分析API - 集成真实的AI模型"""
    try:
        data = request.get_json()
        
        # 提取参数
        handwash_data = data.get('data', [])
        current_step = data.get('step', 1)
        request_id = data.get('requestId', f"api_req_{int(time.time())}")
        
        # 验证参数
        if not handwash_data:
            return jsonify({
                'error': '缺少洗手数据',
                'requestId': request_id
            }), 400
            
        if not isinstance(current_step, int) or current_step < 1 or current_step > 7:
            return jsonify({
                'error': '无效的步骤参数，应为1-7之间的整数',
                'requestId': request_id
            }), 400
        
        # 使用洗手检测服务进行分析
        result = handwash_service.analyze_handwash(
            data=handwash_data,
            step=current_step,
            request_id=request_id
        )
        
        # 检查是否有错误
        if 'error' in result:
            return jsonify(result), 400
        
        # 添加额外的响应信息
        response_data = {
            **result,
            'success': True,
            'message': '洗手分析完成',
            'nextStep': current_step + 1 if current_step < 7 else None
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return handle_error(e)

# 新增：洗手检测统计API
@app.route('/api/handwash/stats', methods=['GET'])
def handwash_stats():
    """获取洗手检测系统统计信息"""
    try:
        stats = handwash_service.get_detection_stats()
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.datetime.now().isoformat()
        })
    except Exception as e:
        return handle_error(e)

# 新增：洗手检测健康检查
@app.route('/api/handwash/health', methods=['GET'])
def handwash_health():
    """洗手检测服务健康检查"""
    try:
        stats = handwash_service.get_detection_stats()
        
        # 检查服务状态
        health_status = {
            'status': stats.get('status', 'unknown'),
            'modelPool': stats['modelPool'],
            'ready': stats['modelPool']['available'] > 0,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        status_code = 200 if health_status['ready'] else 503
        return jsonify(health_status), status_code
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'ready': False,
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat()
        }), 503

@app.route('/api/logs', methods=['POST'])
def api_logs():
    """接收前端日志"""
    try:
        data = request.get_json()
        
        # 保存日志到数据库
        db_service.create_log(
            level=data.get('level', 'info'),
            message=data.get('message', ''),
            metadata=data
        )
        
        return jsonify({
            'success': True,
            'message': '日志已保存'
        })
        
    except Exception as e:
        return handle_error(e)

@app.route('/api/test', methods=['POST'])
def api_test():
    """API连接测试端点"""
    try:
        data = request.get_json()
        return jsonify({
            'success': True,
            'message': '连接测试成功',
            'server': 'Flask',
            'received_data': data,
            'timestamp': datetime.datetime.now().isoformat()
        })
    except Exception as e:
        return handle_error(e)

# 错误处理
def handle_error(error):
    """统一错误处理"""
    print(f"API错误: {error}")
    print(traceback.format_exc())
    
    if hasattr(error, 'code'):
        status_code = error.code
    else:
        status_code = 500
    
    return jsonify({
        'success': False,
        'error': str(error),
        'timestamp': datetime.datetime.now().isoformat()
    }), status_code

@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({
        'success': False,
        'error': 'Not found',
        'path': request.path,
        'timestamp': datetime.datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.datetime.now().isoformat()
    }), 500

# 初始化数据库
def init_database():
    """初始化数据库"""
    print("🗄️ 初始化SQLite数据库...")
    
    # 确保数据目录存在
    os.makedirs('./data', exist_ok=True)
    
    # 初始化数据库表
    db_service.init_database()
    print("✅ 数据库初始化完成")

if __name__ == '__main__':
    print("🚀 启动洗手检测服务器 (Flask版本)")
    
    # 初始化数据库
    init_database()
    
    # 启动服务器
    print("✅ 服务器启动成功！")
    print("📊 数据库：SQLite (本地存储)")
    print("🌐 服务器地址：http://localhost:8000")
    print("📱 模式：完全离线")
    print("===============================")
    
    app.run(host='0.0.0.0', port=8000, debug=True) 