#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import json
import html
from datetime import datetime

def get_database_data(db_path):
    """从SQLite数据库读取数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取账户数据
    cursor.execute("SELECT * FROM account")
    account_data = cursor.fetchall()
    
    # 获取用户信息数据
    cursor.execute("SELECT * FROM user_info")
    user_info_data = cursor.fetchall()
    
    conn.close()
    
    return account_data, user_info_data

def format_user_info_data(user_info_data):
    """格式化用户信息数据"""
    formatted_data = []
    for row in user_info_data:
        formatted_row = list(row)
        # 确保 JSON 字段正确格式化
        if formatted_row[6]:  # step_points
            try:
                json.loads(formatted_row[6])
            except json.JSONDecodeError:
                formatted_row[6] = "[]"
        
        if formatted_row[9]:  # rating
            try:
                json.loads(formatted_row[9])
            except json.JSONDecodeError:
                formatted_row[9] = '{"ui":0,"training":0,"recommend":0}'
                
        formatted_data.append(formatted_row)
    
    return formatted_data

def generate_html(account_data, user_info_data):
    """生成HTML内容"""
    
    # 转换数据为JavaScript格式
    account_js = json.dumps([[row[0], row[1]] for row in account_data], ensure_ascii=False)
    
    user_info_js_data = []
    for row in user_info_data:
        user_info_js_data.append([
            row[0],  # id
            row[1],  # accountID
            row[2] or "",  # userID
            row[3],  # role
            row[4],  # start_time
            float(row[6]) if row[6] else 0.0,  # total
            row[7] or "[]",  # step_points
            row[9] or '{"ui":0,"training":0,"recommend":0}'  # rating
        ])
    
    user_info_js = json.dumps(user_info_js_data, ensure_ascii=False)
    
    html_template = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HandHygiene 数据库查看器</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }}
        
        .last-updated {{
            margin-top: 10px;
            opacity: 0.8;
            font-size: 0.9rem;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .section {{
            margin-bottom: 40px;
        }}
        
        .section h2 {{
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 1.8rem;
        }}
        
        .table-container {{
            overflow-x: auto;
            border-radius: 8px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            font-size: 14px;
        }}
        
        th {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 10px;
            text-align: left;
            font-weight: 600;
            border: none;
            position: sticky;
            top: 0;
            z-index: 10;
        }}
        
        td {{
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }}
        
        tr:hover {{
            background-color: #f8f9ff;
        }}
        
        .json-cell {{
            max-width: 250px;
            word-wrap: break-word;
            background-color: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            white-space: pre-wrap;
        }}
        
        .score {{
            font-weight: bold;
            color: #28a745;
            font-size: 1.1rem;
        }}
        
        .role-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            color: white;
        }}
        
        .role-doctor {{ background-color: #007bff; }}
        .role-nurse {{ background-color: #28a745; }}
        .role-other {{ background-color: #6c757d; }}
        
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
        }}
        
        .stat-number {{
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        
        .stat-label {{
            font-size: 0.9rem;
            opacity: 0.9;
        }}
        
        .empty-message {{
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px;
        }}
        
        .refresh-btn {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }}
        
        .refresh-btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }}
        
        .data-summary {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 HandHygiene 数据库查看器</h1>
            <p>实时数据库内容展示</p>
            <div class="last-updated">最后更新: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
        
        <div class="content">
            <div class="stats" id="stats">
                <!-- 统计信息将动态生成 -->
            </div>
            
            <div class="section">
                <h2>👥 账户信息 (account)</h2>
                <div class="data-summary">
                    <strong>表说明:</strong> 存储用户账户的基本信息，包括账户ID和加密后的密码哈希值
                </div>
                <div class="table-container">
                    <table id="accountTable">
                        <thead>
                            <tr>
                                <th>账户ID</th>
                                <th>密码哈希值</th>
                            </tr>
                        </thead>
                        <tbody id="accountData">
                            <!-- 数据将动态填充 -->
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="section">
                <h2>📊 用户信息 (user_info)</h2>
                <div class="data-summary">
                    <strong>表说明:</strong> 存储详细的用户洗手训练记录，包括角色、成绩、步骤评分等信息
                </div>
                <div class="table-container">
                    <table id="userInfoTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>账户ID</th>
                                <th>用户ID</th>
                                <th>角色</th>
                                <th>开始时间</th>
                                <th>总分</th>
                                <th>步骤评分</th>
                                <th>用户评价</th>
                            </tr>
                        </thead>
                        <tbody id="userInfoData">
                            <!-- 数据将动态填充 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>

    <script>
        // 数据库数据
        const accountData = {account_js};
        const userInfoData = {user_info_js};
        
        function getRoleBadge(role) {{
            const roleClass = `role-${{role.toLowerCase()}}`;
            return `<span class="role-badge ${{roleClass}}">${{role}}</span>`;
        }}
        
        function formatJSON(jsonStr) {{
            try {{
                const obj = JSON.parse(jsonStr);
                return `<div class="json-cell">${{JSON.stringify(obj, null, 2)}}</div>`;
            }} catch (e) {{
                return `<div class="json-cell">${{jsonStr}}</div>`;
            }}
        }}
        
        function populateAccountTable() {{
            const tbody = document.getElementById('accountData');
            if (accountData.length === 0) {{
                tbody.innerHTML = '<tr><td colspan="2" class="empty-message">暂无账户数据</td></tr>';
                return;
            }}
            
            tbody.innerHTML = accountData.map((row, index) => 
                `<tr>
                    <td><strong>${{row[0]}}</strong></td>
                    <td style="font-family: monospace; font-size: 12px;" title="${{row[1]}}">${{row[1].substring(0, 60)}}...</td>
                </tr>`
            ).join('');
        }}
        
        function populateUserInfoTable() {{
            const tbody = document.getElementById('userInfoData');
            if (userInfoData.length === 0) {{
                tbody.innerHTML = '<tr><td colspan="8" class="empty-message">暂无用户信息数据</td></tr>';
                return;
            }}
            
            tbody.innerHTML = userInfoData.map(row => 
                `<tr>
                    <td><strong>${{row[0]}}</strong></td>
                    <td>${{row[1]}}</td>
                    <td>${{row[2] || '<em>未设置</em>'}}</td>
                    <td>${{getRoleBadge(row[3])}}</td>
                    <td>${{row[4]}}</td>
                    <td><span class="score">${{row[5]}}</span></td>
                    <td>${{formatJSON(row[6])}}</td>
                    <td>${{formatJSON(row[7])}}</td>
                </tr>`
            ).join('');
        }}
        
        function calculateStats() {{
            const totalAccounts = accountData.length;
            const totalSessions = userInfoData.length;
            const completedSessions = userInfoData.filter(row => row[5] > 0).length;
            const avgScore = userInfoData.length > 0 ? 
                (userInfoData.reduce((sum, row) => sum + row[5], 0) / userInfoData.length).toFixed(2) : 0;
            
            const roleStats = userInfoData.reduce((acc, row) => {{
                acc[row[3]] = (acc[row[3]] || 0) + 1;
                return acc;
            }}, {{}});
            
            const statsContainer = document.getElementById('stats');
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${{totalAccounts}}</div>
                    <div class="stat-label">注册账户</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${{totalSessions}}</div>
                    <div class="stat-label">总会话数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${{completedSessions}}</div>
                    <div class="stat-label">完成的会话</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${{avgScore}}</div>
                    <div class="stat-label">平均分数</div>
                </div>
            `;
        }}
        
        // 初始化页面
        document.addEventListener('DOMContentLoaded', function() {{
            calculateStats();
            populateAccountTable();
            populateUserInfoTable();
        }});
    </script>
</body>
</html>"""
    
    return html_template

def main():
    """主函数"""
    db_path = "data/data.db"
    
    try:
        # 读取数据库数据
        account_data, user_info_data = get_database_data(db_path)
        
        # 格式化数据
        user_info_data = format_user_info_data(user_info_data)
        
        # 生成HTML
        html_content = generate_html(account_data, user_info_data)
        
        # 写入文件
        with open("database_viewer_live.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print("✅ 数据库查看器已生成: database_viewer_live.html")
        print(f"📊 账户数量: {len(account_data)}")
        print(f"📊 用户会话数量: {len(user_info_data)}")
        print("🌐 请在浏览器中打开 database_viewer_live.html 查看数据")
        
    except sqlite3.Error as e:
        print(f"❌ 数据库错误: {e}")
    except Exception as e:
        print(f"❌ 发生错误: {e}")

if __name__ == "__main__":
    main() 