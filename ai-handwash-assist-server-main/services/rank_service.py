class RankService:
    """排名服务类"""
    
    def __init__(self, db_service):
        self.db = db_service
    
    def get_rankings(self, data):
        """获取排名"""
        # 获取用户排名（按最佳分数排序）
        users = self.db.get_user_rankings(data.get('limit', 10) if data else 10)
        
        # 格式化排名数据
        rankings = []
        for index, user in enumerate(users):
            rankings.append({
                'rank': index + 1,
                'accountSerialNumber': user['account_serial_number'],
                'name': user.get('name') or '匿名用户',
                'bestScore': user.get('best_score', 0),
                'totalSessions': user.get('total_sessions', 0),
                'deviceId': user.get('device_id'),
                'lastActiveAt': user.get('updated_at')
            })
        
        # 记录查询日志
        self.db.create_log('info', f"获取排名数据，返回 {len(rankings)} 条记录", {
            'requestLimit': data.get('limit', 10) if data else 10,
            'resultCount': len(rankings)
        })
        
        return {
            'success': True,
            'data': {
                'rankings': rankings,
                'totalUsers': len(rankings),
                'timestamp': self._get_current_time()
            }
        }
    
    def get_user_rank(self, data):
        """获取用户个人排名"""
        if not data.get('userId'):
            error = Exception("Missing userId")
            error.code = 400
            raise error
        
        # 获取用户信息
        user = self.db.find_user(data['userId'])
        if not user:
            error = Exception("User not found")
            error.code = 404
            raise error
        
        # 获取所有用户排名以计算当前用户的位置
        all_users = self.db.get_user_rankings(1000)  # 获取更多用户来计算准确排名
        
        user_rank = None
        for index, ranked_user in enumerate(all_users):
            if ranked_user['account_serial_number'] == data['userId']:
                user_rank = index + 1
                break
        
        return {
            'success': True,
            'data': {
                'accountSerialNumber': user['account_serial_number'],
                'name': user.get('name') or '匿名用户',
                'rank': user_rank or 'N/A',
                'bestScore': user.get('best_score', 0),
                'totalSessions': user.get('total_sessions', 0),
                'deviceId': user.get('device_id'),
                'totalUsers': len(all_users)
            }
        }
    
    def get_device_rankings(self, data):
        """获取设备排名（按设备分组）"""
        # 获取所有用户数据
        all_users = self.db.get_user_rankings(1000)
        
        # 按设备分组统计
        device_stats = {}
        for user in all_users:
            device_id = user.get('device_id') or 'unknown'
            if device_id not in device_stats:
                device_stats[device_id] = {
                    'deviceId': device_id,
                    'userCount': 0,
                    'totalSessions': 0,
                    'averageScore': 0,
                    'bestScore': 0,
                    'totalScore': 0
                }
            
            device_stats[device_id]['userCount'] += 1
            device_stats[device_id]['totalSessions'] += user.get('total_sessions', 0)
            device_stats[device_id]['totalScore'] += user.get('best_score', 0)
            device_stats[device_id]['bestScore'] = max(
                device_stats[device_id]['bestScore'], 
                user.get('best_score', 0)
            )
        
        # 计算平均分并排序
        device_rankings = []
        for device in device_stats.values():
            device['averageScore'] = round(
                device['totalScore'] / device['userCount'] if device['userCount'] > 0 else 0, 
                2
            )
            device_rankings.append(device)
        
        # 按平均分排序
        device_rankings.sort(key=lambda x: x['averageScore'], reverse=True)
        
        # 限制返回数量
        limit = data.get('limit', 10) if data else 10
        device_rankings = device_rankings[:limit]
        
        return {
            'success': True,
            'data': {
                'deviceRankings': device_rankings,
                'totalDevices': len(device_stats),
                'timestamp': self._get_current_time()
            }
        }
    
    def _get_current_time(self):
        """获取当前时间"""
        import datetime
        return datetime.datetime.now().isoformat() 