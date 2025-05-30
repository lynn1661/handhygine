import bcrypt
import datetime

class UserService:
    """用户服务类"""
    
    def __init__(self, db_service):
        self.db = db_service
    
    def login(self, data):
        """用户登录"""
        # 验证必须字段
        if not data.get('accountSerialNumber') or not data.get('password'):
            error = Exception("Missing field. Required fields: accountSerialNumber and password")
            error.code = 400
            raise error
        
        # 查找用户
        user = self.db.find_user(data['accountSerialNumber'])
        if not user:
            error = Exception("Invalid account serial number")
            error.code = 401
            raise error
        
        # 如果用户没有密码（匿名用户），允许登录
        if not user.get('password'):
            self.db.create_log('info', f"用户 {data['accountSerialNumber']} 匿名登录", {
                'userId': data['accountSerialNumber'],
                'loginType': 'anonymous'
            })
            
            return {
                'message': 'Successfully Login (Anonymous)',
                'accountSerialNumber': user['account_serial_number'],
                'isAnonymous': True,
                'userInfo': {
                    'name': user.get('name'),
                    'totalSessions': user.get('total_sessions', 0),
                    'bestScore': user.get('best_score', 0)
                }
            }
        
        # 验证密码
        is_valid = bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8'))
        if is_valid:
            # 更新最后登录时间
            self.db.update_user(data['accountSerialNumber'], {
                'lastSyncAt': datetime.datetime.now()
            })
            
            self.db.create_log('info', f"用户 {data['accountSerialNumber']} 登录成功", {
                'userId': data['accountSerialNumber'],
                'loginType': 'password'
            })
            
            return {
                'message': 'Successfully Login',
                'accountSerialNumber': user['account_serial_number'],
                'isAnonymous': False,
                'userInfo': {
                    'name': user.get('name'),
                    'email': user.get('email'),
                    'totalSessions': user.get('total_sessions', 0),
                    'bestScore': user.get('best_score', 0)
                }
            }
        else:
            self.db.create_log('warn', f"用户 {data['accountSerialNumber']} 登录失败：密码错误", {
                'userId': data['accountSerialNumber']
            })
            
            error = Exception("Password wrong")
            error.code = 401
            raise error
    
    def register(self, data):
        """用户注册"""
        # 验证必须字段
        if not data.get('accountSerialNumber'):
            error = Exception("Missing field. Required field: accountSerialNumber")
            error.code = 400
            raise error
        
        # 检查用户是否已存在
        existing_user = self.db.find_user(data['accountSerialNumber'])
        if existing_user:
            error = Exception("User already exists")
            error.code = 409
            raise error
        
        # 准备用户数据
        user_data = {
            'accountSerialNumber': data['accountSerialNumber'],
            'name': data.get('name'),
            'email': data.get('email'),
            'password': None,
            'totalSessions': 0,
            'bestScore': 0.0
        }
        
        # 如果提供了密码，进行加密
        if data.get('password'):
            salt = bcrypt.gensalt()
            user_data['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), salt).decode('utf-8')
        
        # 创建用户
        new_user = self.db.create_user(user_data)
        
        self.db.create_log('info', f"新用户注册: {data['accountSerialNumber']}", {
            'userId': data['accountSerialNumber'],
            'hasPassword': bool(data.get('password'))
        })
        
        return {
            'message': 'User registered successfully',
            'accountSerialNumber': new_user['account_serial_number'],
            'isAnonymous': not data.get('password'),
            'userInfo': {
                'name': new_user.get('name'),
                'email': new_user.get('email'),
                'totalSessions': new_user.get('total_sessions', 0),
                'bestScore': new_user.get('best_score', 0)
            }
        }
    
    def get_user_info(self, data):
        """获取用户信息"""
        if not data.get('accountSerialNumber'):
            error = Exception("Missing accountSerialNumber")
            error.code = 400
            raise error
        
        user = self.db.find_user(data['accountSerialNumber'])
        if not user:
            error = Exception("User not found")
            error.code = 404
            raise error
        
        return {
            'success': True,
            'data': {
                'accountSerialNumber': user['account_serial_number'],
                'name': user.get('name'),
                'email': user.get('email'),
                'totalSessions': user.get('total_sessions', 0),
                'bestScore': user.get('best_score', 0),
                'deviceId': user.get('device_id'),
                'createdAt': user.get('created_at'),
                'lastSyncAt': user.get('last_sync_at')
            }
        }
    
    def update_user_info(self, data):
        """更新用户信息"""
        if not data.get('accountSerialNumber'):
            error = Exception("Missing accountSerialNumber")
            error.code = 400
            raise error
        
        # 准备更新数据
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'email' in data:
            update_data['email'] = data['email']
        
        # 如果需要更新密码
        if data.get('password'):
            salt = bcrypt.gensalt()
            update_data['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), salt).decode('utf-8')
        
        updated_user = self.db.update_user(data['accountSerialNumber'], update_data)
        
        self.db.create_log('info', f"用户信息更新: {data['accountSerialNumber']}", {
            'userId': data['accountSerialNumber'],
            'updatedFields': list(update_data.keys())
        })
        
        return {
            'success': True,
            'message': 'User information updated successfully',
            'data': {
                'accountSerialNumber': updated_user['account_serial_number'],
                'name': updated_user.get('name'),
                'email': updated_user.get('email')
            }
        } 