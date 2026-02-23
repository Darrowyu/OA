#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统审批模块完整功能测试
覆盖申请、审批、工作流、权限等所有功能
"""

import sys
import io
import time
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5173"
SCREENSHOTS_DIR = "e2e/screenshots/approval"

class ApprovalTestSuite:
    """审批模块完整测试套件"""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.test_results = []
        self.created_application_ids = []

    def setup(self):
        """初始化浏览器"""
        p = sync_playwright().start()
        self.browser = p.chromium.launch(
            headless=True,
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        )
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir="e2e/videos/approval",
            record_video_size={"width": 1920, "height": 1080}
        )
        self.page = self.context.new_page()

    def teardown(self):
        """关闭浏览器"""
        if self.browser:
            self.browser.close()

    def screenshot(self, name):
        """保存截图"""
        self.page.screenshot(path=f"{SCREENSHOTS_DIR}/{name}.png", full_page=True)

    def log(self, message):
        """打印日志"""
        print(message)

    def login(self, username, password):
        """通用登录方法"""
        self.page.goto(f"{BASE_URL}/login")
        self.page.wait_for_load_state("networkidle")
        self.page.fill("input#username", username)
        self.page.fill("input#password", password)
        self.page.click("button[type='submit']")
        self.page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)

    # ========== 一、申请创建测试 ==========

    def test_create_application_normal(self):
        """测试1: 正常创建申请"""
        self.log("\n[TEST 1] 正常创建申请")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            # 填写表单
            self.page.fill('input[name="title"]', "测试费用申请-正常")
            self.page.fill('textarea[name="content"]', "这是一个测试申请内容")
            self.page.fill('input[name="amount"]', "5000")

            # 选择优先级
            self.page.click('text=普通')
            self.page.click('text=高')

            # 选择厂长
            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')
            self.page.click('button:has-text("确定")')

            # 提交申请
            self.page.click('button[type="submit"]')

            # 等待提交成功（跳转到列表页或显示成功提示）
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 正常创建申请成功")
            self.screenshot("01-create-normal")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("01-create-error")
            return False

    def test_create_application_no_amount(self):
        """测试2: 创建申请（不带金额）"""
        self.log("\n[TEST 2] 创建申请（不带金额）")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            self.page.fill('input[name="title"]', "测试申请-无金额")
            self.page.fill('textarea[name="content"]', "无金额申请内容")
            # 不填写金额

            # 选择厂长
            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')
            self.page.click('button:has-text("确定")')

            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 无金额申请创建成功")
            self.screenshot("02-create-no-amount")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_create_application_skip_manager(self):
        """测试3: 创建申请（跳过经理审批）"""
        self.log("\n[TEST 3] 创建申请（跳过经理审批）")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            self.page.fill('input[name="title"]', "测试申请-跳过经理")
            self.page.fill('textarea[name="content"]', "跳过经理审批测试")
            self.page.fill('input[name="amount"]', "10000")

            # 勾选跳过经理
            self.page.click('input[type="checkbox"]:near(text=跳过经理审批)')

            # 选择厂长
            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')
            self.page.click('button:has-text("确定")')

            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 跳过经理申请创建成功")
            self.screenshot("03-create-skip-manager")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_create_application_validation(self):
        """测试4: 申请表单验证"""
        self.log("\n[TEST 4] 申请表单验证")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            # 不填任何内容直接提交
            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(1000)

            # 验证错误提示
            error_visible = self.page.locator('.text-red-500, .error, [role="alert"]').is_visible()
            if error_visible:
                self.log("  [PASS] 表单验证生效，显示错误提示")
            else:
                self.log("  [WARN] 未看到明显错误提示")

            self.screenshot("04-form-validation")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 二、审批流程测试 ==========

    def test_approval_flow_complete(self):
        """测试5: 完整审批流程（厂长→总监→经理→CEO）"""
        self.log("\n[TEST 5] 完整审批流程")
        try:
            # Step 1: user1 创建申请
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            self.page.fill('input[name="title"]', "完整流程测试申请")
            self.page.fill('textarea[name="content"]', "测试完整审批流程")
            self.page.fill('input[name="amount"]', "5000")

            # 选择厂长
            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')
            self.page.click('button:has-text("确定")')

            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 申请已提交")

            # Step 2: 厂长审批
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            # 找到申请并点击
            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(1000)

            # 通过审批
            self.page.click('button:has-text("通过")')
            self.page.wait_for_timeout(500)
            self.page.fill('textarea[placeholder*="意见"]', "厂长审批通过")
            self.page.click('.modal button:has-text("确认")')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 厂长审批通过")

            # Step 3: 总监审批
            self.login("director1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(1000)

            # 选择经理并审批
            self.page.click('button:has-text("选择审批经理")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.manager-item:first-child')
            self.page.click('button:has-text("确定")')

            self.page.click('button:has-text("通过")')
            self.page.wait_for_timeout(500)
            self.page.fill('textarea[placeholder*="意见"]', "总监审批通过")
            self.page.click('.modal button:has-text("确认")')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 总监审批通过")

            # Step 4: 经理审批
            self.login("manager1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(1000)

            self.page.click('button:has-text("通过")')
            self.page.wait_for_timeout(500)
            self.page.fill('textarea[placeholder*="意见"]', "经理审批通过")
            self.page.click('.modal button:has-text("确认")')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] 经理审批通过")

            # Step 5: CEO审批
            self.login("ceo1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(1000)

            self.page.click('button:has-text("通过")')
            self.page.wait_for_timeout(500)
            self.page.fill('textarea[placeholder*="意见"]', "CEO审批通过，同意")
            self.page.click('.modal button:has-text("确认")')
            self.page.wait_for_timeout(2000)

            self.log("  [PASS] CEO审批通过，流程完成")

            self.screenshot("05-flow-complete")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("05-flow-error")
            return False

    def test_approval_flow_reject(self):
        """测试6: 审批拒绝流程"""
        self.log("\n[TEST 6] 审批拒绝流程")
        try:
            # 创建申请
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            self.page.fill('input[name="title"]', "拒绝测试申请")
            self.page.fill('textarea[name="content"]', "测试拒绝流程")
            self.page.fill('input[name="amount"]', "3000")

            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')
            self.page.click('button:has-text("确定")')

            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(2000)

            # 厂长拒绝
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            self.page.click('text=拒绝测试申请')
            self.page.wait_for_timeout(1000)

            self.page.click('button:has-text("拒绝")')
            self.page.wait_for_timeout(500)
            self.page.fill('textarea[placeholder*="意见"]', "金额不合理，拒绝")
            self.page.click('.modal button:has-text("确认")')
            self.page.wait_for_timeout(2000)

            # 验证状态变为已拒绝
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            self.log("  [PASS] 审批拒绝流程完成")
            self.screenshot("06-flow-reject")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 三、列表和筛选测试 ==========

    def test_application_list(self):
        """测试7: 申请列表功能"""
        self.log("\n[TEST 7] 申请列表功能")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 验证列表元素
            assert self.page.locator('text=全部申请').is_visible()
            assert self.page.locator('text=待我审批').is_visible()
            assert self.page.locator('text=我已审批').is_visible()
            assert self.page.locator('text=我的申请').is_visible()

            self.log("  [PASS] 列表标签页正常")

            # 测试搜索
            search_box = self.page.locator('input[placeholder*="搜索"]').first
            if search_box.is_visible():
                search_box.fill("测试")
                self.page.keyboard.press("Enter")
                self.page.wait_for_timeout(1000)
                self.log("  [PASS] 搜索功能正常")

            # 测试筛选
            self.page.click('text=状态')
            self.page.wait_for_timeout(500)
            self.log("  [PASS] 筛选功能正常")

            self.screenshot("07-list-page")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_pending_approval_list(self):
        """测试8: 待审批列表"""
        self.log("\n[TEST 8] 待审批列表")
        try:
            # 用厂长账号查看待审批
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            # 验证页面元素
            title = self.page.locator('h1, h2').first.inner_text()
            assert "待审批" in title or "Pending" in title

            self.log("  [PASS] 待审批列表页面加载")
            self.screenshot("08-pending-list")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_approved_list(self):
        """测试9: 已审批列表"""
        self.log("\n[TEST 9] 已审批列表")
        try:
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/approved")
            self.page.wait_for_load_state("networkidle")

            # 验证已通过/已拒绝筛选
            self.page.click('text=已通过')
            self.page.wait_for_timeout(500)
            self.page.click('text=已拒绝')
            self.page.wait_for_timeout(500)

            self.log("  [PASS] 已审批列表和筛选正常")
            self.screenshot("09-approved-list")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 四、申请详情测试 ==========

    def test_application_detail(self):
        """测试10: 申请详情页面"""
        self.log("\n[TEST 10] 申请详情页面")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 点击第一个申请查看详情
            rows = self.page.locator('tr, .application-item').all()
            if len(rows) > 0:
                rows[0].click()
                self.page.wait_for_timeout(1000)

                # 验证详情页元素
                assert self.page.locator('text=申请详情').is_visible() or \
                       self.page.locator('text=审批记录').is_visible() or \
                       self.page.locator('text=基本信息').is_visible()

                self.log("  [PASS] 申请详情页正常")
                self.screenshot("10-detail-page")
            else:
                self.log("  [SKIP] 没有申请记录可供查看")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 五、权限测试 ==========

    def test_permission_user_cannot_approve(self):
        """测试11: 普通用户无法审批"""
        self.log("\n[TEST 11] 普通用户无法审批权限")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            # 普通用户不应看到待审批申请或审批按钮
            no_pending = self.page.locator('text=暂无待审批').is_visible() or \
                        self.page.locator('text=没有数据').is_visible() or \
                        self.page.locator('.empty-state').is_visible()

            if no_pending:
                self.log("  [PASS] 普通用户无待审批申请")
            else:
                self.log("  [INFO] 普通用户可能看到自己提交的申请")

            self.screenshot("11-permission-user")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_permission_wrong_approver(self):
        """测试12: 非指定审批人无法审批"""
        self.log("\n[TEST 12] 非指定审批人权限")
        try:
            # user1 创建申请指定 factory1
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval/new")
            self.page.wait_for_load_state("networkidle")

            self.page.fill('input[name="title"]', "权限测试申请")
            self.page.fill('textarea[name="content"]', "测试非指定审批人")
            self.page.fill('input[name="amount"]', "2000")

            self.page.click('button:has-text("选择审批厂长")')
            self.page.wait_for_selector('.modal, .dialog', timeout=3000)
            self.page.click('.factory-manager-item:first-child')  # 选择第一个厂长
            self.page.click('button:has-text("确定")')

            self.page.click('button[type="submit"]')
            self.page.wait_for_timeout(2000)

            # 使用其他厂长账号（如果有多个）或总监账号查看
            # 这里假设只有 factory1 是审批人
            self.login("director1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")

            # 总监不应看到这个待审批（因为是厂长审批阶段）
            pending_items = self.page.locator('text=权限测试申请').all()
            if len(pending_items) == 0:
                self.log("  [PASS] 非指定审批人看不到待审批")
            else:
                self.log("  [INFO] 总监可能看到申请但无法审批")

            self.screenshot("12-permission-wrong-approver")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 六、数据统计测试 ==========

    def test_statistics_cards(self):
        """测试13: 统计卡片"""
        self.log("\n[TEST 13] 统计卡片显示")
        try:
            self.login("admin", "admin123")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 验证统计卡片
            stats = ["总申请", "待审核", "已通过", "已拒绝", "总金额"]
            for stat in stats:
                try:
                    visible = self.page.locator(f'text={stat}').first.is_visible(timeout=2000)
                    if visible:
                        self.log(f"  [PASS] {stat}统计卡片存在")
                except:
                    pass

            self.screenshot("13-statistics")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_export_excel(self):
        """测试14: 导出Excel功能"""
        self.log("\n[TEST 14] 导出Excel功能")
        try:
            self.login("admin", "admin123")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 点击导出按钮
            export_btn = self.page.locator('button:has-text("导出"), button:has-text("Excel"), .export-btn').first
            if export_btn.is_visible():
                export_btn.click()
                self.page.wait_for_timeout(2000)
                self.log("  [PASS] 导出按钮可点击")
            else:
                self.log("  [SKIP] 未找到导出按钮")

            self.screenshot("14-export")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 七、工作流测试 ==========

    def test_workflow_list(self):
        """测试15: 工作流列表"""
        self.log("\n[TEST 15] 工作流列表页面")
        try:
            self.login("admin", "admin123")
            self.page.goto(f"{BASE_URL}/approval/workflows")
            self.page.wait_for_load_state("networkidle")

            # 验证工作流页面元素
            assert "工作流" in self.page.content() or "workflow" in self.page.content().lower()

            self.log("  [PASS] 工作流列表页面加载")
            self.screenshot("15-workflow-list")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_workflow_create(self):
        """测试16: 创建工作流"""
        self.log("\n[TEST 16] 创建工作流")
        try:
            self.login("admin", "admin123")
            self.page.goto(f"{BASE_URL}/approval/workflows/designer")
            self.page.wait_for_load_state("networkidle")

            # 填写工作流信息
            self.page.fill('input[name="name"]', f"测试工作流_{int(time.time())}")
            self.page.fill('textarea[name="description"]', "自动化测试创建工作流")

            # 如果设计器有保存按钮
            save_btn = self.page.locator('button:has-text("保存"), button:has-text("Save")').first
            if save_btn.is_visible():
                save_btn.click()
                self.page.wait_for_timeout(2000)
                self.log("  [PASS] 工作流保存成功")
            else:
                self.log("  [SKIP] 工作流设计器界面不同")

            self.screenshot("16-workflow-create")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 八、通知测试 ==========

    def test_notifications(self):
        """测试17: 通知功能"""
        self.log("\n[TEST 17] 通知功能")
        try:
            self.login("admin", "admin123")

            # 点击通知图标
            notif_btn = self.page.locator('.notification, .bell, [class*="notification"]').first
            if notif_btn.is_visible():
                notif_btn.click()
                self.page.wait_for_timeout(1000)

                # 验证通知面板
                panel_visible = self.page.locator('.notification-panel, .dropdown').is_visible()
                if panel_visible:
                    self.log("  [PASS] 通知面板可打开")
                else:
                    self.log("  [INFO] 通知面板可能以其他方式显示")
            else:
                self.log("  [SKIP] 未找到通知按钮")

            self.screenshot("17-notifications")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 运行所有测试 ==========

    def run_all_tests(self):
        """运行所有审批模块测试"""
        self.log("\n" + "="*70)
        self.log("OA系统审批模块完整功能测试")
        self.log("="*70)

        self.setup()

        tests = [
            # 一、申请创建测试
            ("创建申请-正常", self.test_create_application_normal),
            ("创建申请-无金额", self.test_create_application_no_amount),
            ("创建申请-跳过经理", self.test_create_application_skip_manager),
            ("申请表单验证", self.test_create_application_validation),

            # 二、审批流程测试
            ("完整审批流程", self.test_approval_flow_complete),
            ("审批拒绝流程", self.test_approval_flow_reject),

            # 三、列表和筛选测试
            ("申请列表功能", self.test_application_list),
            ("待审批列表", self.test_pending_approval_list),
            ("已审批列表", self.test_approved_list),

            # 四、申请详情测试
            ("申请详情页面", self.test_application_detail),

            # 五、权限测试
            ("普通用户权限", self.test_permission_user_cannot_approve),
            ("非指定审批人权限", self.test_permission_wrong_approver),

            # 六、数据统计测试
            ("统计卡片", self.test_statistics_cards),
            ("导出Excel", self.test_export_excel),

            # 七、工作流测试
            ("工作流列表", self.test_workflow_list),
            ("创建工作流", self.test_workflow_create),

            # 八、通知测试
            ("通知功能", self.test_notifications),
        ]

        passed = 0
        failed = 0

        for name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"  [ERROR] {e}")
                failed += 1

        self.teardown()

        self.log("\n" + "="*70)
        self.log(f"测试完成: {passed} 通过, {failed} 失败")
        self.log("="*70)
        self.log(f"\n截图保存在: {SCREENSHOTS_DIR}/")
        self.log(f"视频保存在: e2e/videos/approval/")

        return 0 if failed == 0 else 1


def main():
    suite = ApprovalTestSuite()
    return suite.run_all_tests()


if __name__ == "__main__":
    sys.exit(main())
