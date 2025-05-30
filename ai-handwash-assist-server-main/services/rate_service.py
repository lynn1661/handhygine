class RateService:
    """评分服务类"""
    
    def __init__(self, db_service):
        self.db = db_service
    
    def submit_rating(self, data):
        """提交评分"""
        # 验证必须字段
        if not data.get('id') or data.get('rating') is None:
            error = Exception("Missing field. Required fields: id and rating.")
            error.code = 400
            raise error
        
        # 查找用户记录
        user = self.db.find_user(data['id'])
        if not user:
            error = Exception("Record not found")
            error.code = 404
            raise error
        
        # 计算评分点数
        points = 0
        rating_text = ''
        
        rating_input = str(data['rating']).lower()
        if rating_input == 'perfect':
            points = 100
            rating_text = 'PERFECT'
        elif rating_input == 'good':
            points = 80
            rating_text = 'GOOD'
        elif rating_input in ['need improvement', 'improvement']:
            points = 60
            rating_text = 'Need Improvement'
        else:
            try:
                points = float(data['rating'])
                rating_text = str(data['rating'])
            except ValueError:
                points = 0
                rating_text = str(data['rating'])
        
        # 创建评分记录
        rating_record = self.db.create_rating({
            'userId': data['id'],
            'rating': rating_text,
            'points': points,
            'step': data.get('step'),
            'stepVideoFile': data.get('stepVideoFile'),
            'sessionId': data.get('sessionId'),
            'detectionAccuracy': data.get('detectionAccuracy'),
            'completionTime': data.get('completionTime')
        })
        
        # 更新用户统计信息
        current_sessions = user.get('total_sessions', 0) + 1
        current_best_score = max(user.get('best_score', 0), points)
        
        self.db.update_user(data['id'], {
            'totalSessions': current_sessions,
            'bestScore': current_best_score
        })
        
        # 记录操作日志
        self.db.create_log('info', f"用户 {data['id']} 获得评分: {rating_text} ({points}分)", {
            'userId': data['id'],
            'rating': rating_text,
            'points': points,
            'sessionId': data.get('sessionId')
        })
        
        # 返回结果
        return {
            'success': True,
            'data': {
                'id': str(rating_record['id']),
                'userId': rating_record['user_id'],
                'rating': rating_record['rating'],
                'points': rating_record['points'],
                'step': rating_record.get('step'),
                'sessionId': rating_record.get('session_id'),
                'createdAt': rating_record['created_at'],
                'userStats': {
                    'totalSessions': current_sessions,
                    'bestScore': current_best_score
                }
            }
        }
    
    def get_user_ratings(self, data):
        """获取用户评分历史"""
        if not data.get('userId'):
            error = Exception("Missing userId")
            error.code = 400
            raise error
        
        ratings = self.db.get_ratings_by_user(data['userId'], data.get('limit', 10))
        
        return {
            'success': True,
            'data': [
                {
                    'id': str(rating['id']),
                    'rating': rating['rating'],
                    'points': rating['points'],
                    'step': rating.get('step'),
                    'sessionId': rating.get('session_id'),
                    'createdAt': rating['created_at']
                }
                for rating in ratings
            ]
        }
    
    def get_stats(self):
        """获取统计信息"""
        stats = self.db.get_stats()
        
        return {
            'success': True,
            'data': stats
        } 