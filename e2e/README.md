# OA系统完整业务流程自动化测试

使用 `webapp-testing` skill 进行端到端测试，覆盖所有核心用户操作。

## 测试覆盖范围

### 16个核心测试场景

| 编号 | 测试项 | 说明 |
|------|--------|------|
| 01 | 登录登出 | 验证登录页、错误密码提示、成功登录跳转 |
| 02 | 工作台快捷入口 | 验证快捷入口存在和跳转功能 |
| 03 | 侧边栏导航 | 测试12个模块的导航跳转 |
| 04 | 审批流程 | 审批中心标签页切换验证 |
| 05 | 设备管理 | 设备列表页面加载和搜索功能 |
| 06 | 考勤打卡 | 考勤页面加载和打卡功能可见性 |
| 07 | 会议室预订 | 会议管理页面加载验证 |
| 08 | 文档中心 | 文档中心页面加载验证 |
| 09 | 通讯录 | 通讯录和组织架构页面验证 |
| 10 | 公告通知 | 公告通知页面加载验证 |
| 11 | 知识库 | 知识库页面加载验证 |
| 12 | 报表中心 | 报表中心页面加载验证 |
| 13 | 任务管理 | 任务管理页面加载验证 |
| 14 | 日程管理 | 日程管理页面加载验证 |
| 15 | 个人设置 | 个人设置页面加载验证 |
| 16 | 响应式设计 | 平板(768px)和手机(375px)尺寸适配 |

## 运行测试

### 方式1: 使用 webapp-testing skill（推荐）

自动管理服务器生命周期：

```bash
python ~/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm start" --port 5173 \
  -- python e2e/test_complete_workflow.py
```

### 方式2: 服务器已运行时

如果前后端服务已在运行：

```bash
cd e2e && python test_complete_workflow.py
```

## 测试文件

```
e2e/
├── test_complete_workflow.py    # 完整测试套件（16个测试场景）
├── test_oa_system.py            # 简化版测试（4个核心场景）
├── screenshots/                 # 测试截图输出
│   ├── 01-login-success.png
│   ├── 05-equipment-list.png
│   ├── 16-responsive-tablet.png
│   └── ...
└── videos/                      # 测试视频录制（如启用）
```

## 输出文件

测试完成后生成：
- **截图**: `screenshots/*.png` - 每个测试场景的页面截图
- **视频**: `videos/*.webm` - 页面操作视频录制（需启用）

## 测试结果示例

```
============================================================
OA系统完整业务流程自动化测试
============================================================

[TEST 1] 登录登出流程
  [PASS] 登录页面元素验证
  [PASS] 错误密码提示验证
  [PASS] 成功登录并跳转工作台
  [PASS] 工作台页面加载验证

[TEST 2] 工作台快捷入口
  [PASS] 快捷入口验证
  [PASS] 设备管理快捷入口跳转

...

============================================================
测试完成: 13 通过, 3 失败
============================================================

截图保存在: e2e/screenshots/
视频保存在: e2e/videos/
```

## 测试架构

### 技术栈
- **测试框架**: Playwright (Python)
- **浏览器**: 系统 Chrome
- **Skill**: webapp-testing
- **服务器管理**: with_server.py

### 测试类结构
```python
class OATestSuite:
    - setup()          # 初始化浏览器
    - teardown()       # 关闭浏览器
    - screenshot()     # 保存截图
    - test_login_logout()      # 测试1
    - test_dashboard_shortcuts()   # 测试2
    - test_navigation_sidebar()    # 测试3
    ... # 共16个测试方法
```

## 扩展测试

添加新测试方法：

```python
def test_new_feature(self):
    """测试新功能"""
    self.log("\n[TEST X] 新功能测试")

    try:
        # 进入页面
        self.page.goto(f"{BASE_URL}/new-feature")
        self.page.wait_for_load_state("networkidle")

        # 验证元素
        assert "新功能" in self.page.content()
        self.log("  [PASS] 新功能页面加载")

        # 截图
        self.screenshot("xx-new-feature")

        return True
    except Exception as e:
        self.log(f"  [FAIL] {e}")
        return False
```

## 依赖

- Python 3.x
- Playwright (`pip install playwright`)
- 系统 Chrome 浏览器
- webapp-testing skill

## 注意事项

1. **编码问题**: Windows 终端可能有中文显示问题，但不影响测试执行
2. **服务器启动**: 使用 skill 方式会自动管理服务器生命周期
3. **截图路径**: 确保 `e2e/screenshots/` 目录存在
4. **测试时长**: 完整测试约 1-2 分钟
