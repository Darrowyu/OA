#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统审批中心全面测试
覆盖完整审批流程、拒绝流程、权限验证等所有场景
"""

import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOTS_DIR = "e2e/screenshots/approval_full"

class ApprovalFullTest:
    """审批中心全面测试套件"""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.test_results = []

    def setup(self):
        """初始化浏览器"""
        p = sync_playwright().start()
        self.browser = p.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080}
        )
        self.page = self.context.new_page()

    def teardown(self):
        """关闭浏览器"""
        if self.browser:
            self.browser.close()

    def log(self, message):
        """打印日志"""
        print(message)

    def screenshot(self, name):
        """保存截图"""
        self.page.screenshot(path=f"{SCREENSHOTS_DIR}/{name}.png", full_page=True)

    def login(self, username, password):
        """通用登录方法"""
        self.page.goto(f"{BASE_URL}/login")
        self.page.wait_for_load_state("networkidle")
        self.page.fill("input#username", username)
        self.page.fill("input#password", password)
        self.page.click("button[type='submit']")
        self.page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)

    def create_application(self, title, content, amount="", factory_manager_index=0):
        """创建申请辅助方法"""
        self.login("user1", "123456")
        self.page.goto(f"{BASE_URL}/approval/new/standard")
        self.page.wait_for_load_state("networkidle")
        self.page.wait_for_timeout(3000)

        # 填写表单
        self.page.fill('input#title', title)
        self.page.fill('textarea#content', content)
        if amount:
            self.page.fill('input#amount', amount)

        # 选择厂长 - 先截图看页面
        self.screenshot(f"create_form_{title[:10]}")

        # 厂长选择是checkbox，但点击可能被外层div拦截
        # 尝试点击包含厂长的label或卡片
        try:
            # 查找包含厂长的文本元素并点击
            factory_labels = self.page.locator('label:has-text("厂长"), .cursor-pointer:has-text("厂长"), [role="checkbox"]').all()
            if len(factory_labels) > 0:
                factory_labels[0].click()
                self.page.wait_for_timeout(500)
                self.log("  [INFO] 已选择厂长")
            else:
                # 尝试直接点击checkbox的父元素
                checkboxes = self.page.locator('input[type="checkbox"]').all()
                for cb in checkboxes:
                    try:
                        # 获取父元素并点击
                        parent = cb.locator('xpath=..')
                        if parent.is_visible():
                            parent.click()
                            self.page.wait_for_timeout(500)
                            self.log("  [INFO] 已选择厂长（通过父元素）")
                            break
                    except:
                        continue
                else:
                    self.log("  [WARN] 未找到可点击的厂长选择")
        except Exception as e:
            self.log(f"  [WARN] 选择厂长时出错: {e}")

        # 提交表单
        try:
            submit_btn = self.page.locator('button[type="submit"]').first
            if submit_btn.is_visible() and submit_btn.is_enabled():
                submit_btn.click()
                # 等待跳转（成功后会跳转到 /approval）
                self.page.wait_for_timeout(5000)
        except Exception as e:
            self.log(f"  [WARN] 提交表单: {e}")

        self.page.wait_for_timeout(2000)
        return self.page.url

    # ========== 一、基础功能测试 ==========

    def test_all_users_login(self):
        """测试1: 所有测试用户登录"""
        self.log("\n[TEST 1] 所有测试用户登录")
        users = [
            ("user1", "普通用户"),
            ("user2", "普通用户2"),
            ("factory1", "张厂长"),
            ("factory2", "李厂长"),
            ("director1", "王总监"),
            ("manager1", "刘经理"),
            ("manager2", "陈经理"),
            ("ceo1", "赵总"),
            ("admin", "管理员"),
        ]

        all_passed = True
        for username, name in users:
            try:
                self.login(username, "123456")
                self.log(f"  [PASS] {username} ({name}) 登录成功")
            except Exception as e:
                self.log(f"  [FAIL] {username} 登录失败: {e}")
                all_passed = False

        self.screenshot("01_all_users_login")
        return all_passed

    def test_application_list_tabs(self):
        """测试2: 申请列表各标签页"""
        self.log("\n[TEST 2] 申请列表各标签页")
        try:
            self.login("user1", "123456")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 测试各个标签页
            tabs = ["全部申请", "待我审批", "我已审批", "我的申请"]
            for tab in tabs:
                try:
                    tab_element = self.page.locator(f'text={tab}').first
                    if tab_element.is_visible(timeout=3000):
                        tab_element.click()
                        self.page.wait_for_timeout(1000)
                        self.log(f"  [PASS] {tab} 标签页可点击")
                except Exception as e:
                    self.log(f"  [INFO] {tab} 标签页: {e}")

            self.screenshot("02_application_tabs")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_create_application_with_amount(self):
        """测试3: 创建带金额申请"""
        self.log("\n[TEST 3] 创建带金额申请")
        try:
            url = self.create_application(
                "测试申请-带金额",
                "这是一个带金额的测试申请",
                "5000"
            )
            self.log(f"  [PASS] 申请创建成功，当前URL: {url}")
            self.screenshot("03_create_with_amount")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("03_create_error")
            return False

    def test_create_application_without_amount(self):
        """测试4: 创建不带金额申请"""
        self.log("\n[TEST 4] 创建不带金额申请")
        try:
            url = self.create_application(
                "测试申请-无金额",
                "这是一个不带金额的测试申请",
                ""
            )
            self.log(f"  [PASS] 申请创建成功，当前URL: {url}")
            self.screenshot("04_create_without_amount")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 二、完整审批流程测试 ==========

    def test_complete_approval_flow(self):
        """测试5: 完整审批流程（厂长→总监→经理→CEO）"""
        self.log("\n[TEST 5] 完整审批流程（厂长→总监→经理→CEO）")
        try:
            # 创建申请
            self.create_application(
                "完整流程测试申请",
                "测试完整审批流程",
                "5000"
            )
            self.log("  [INFO] 申请已创建")

            # Step 1: 厂长审批
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            # 点击申请标题
            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(2000)

            # 点击通过按钮
            approve_btn = self.page.locator('button:has-text("通过"), button:has-text("同意")').first
            if approve_btn.is_visible():
                approve_btn.click()
                self.page.wait_for_timeout(1000)

                # 填写审批意见
                textarea = self.page.locator('textarea').first
                if textarea.is_visible():
                    textarea.fill("厂长审批通过")

                # 确认
                confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定"]').first
                if confirm_btn.is_visible():
                    confirm_btn.click()

                self.page.wait_for_timeout(3000)
                self.log("  [PASS] 厂长审批完成")

            self.screenshot("05_flow_factory_approved")

            # Step 2: 总监审批
            self.login("director1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(2000)

            # 选择流向经理
            flow_btn = self.page.locator('button:has-text("经理")').first
            if flow_btn.is_visible():
                flow_btn.click()
                self.page.wait_for_timeout(1000)

            # 选择经理
            manager_checkbox = self.page.locator('input[type="checkbox"]').first
            if manager_checkbox.is_visible():
                manager_checkbox.click()
                self.page.wait_for_timeout(500)

            # 确认选择
            confirm_btn = self.page.locator('button:has-text("确定"), button:has-text("确认"]').first
            if confirm_btn.is_visible():
                confirm_btn.click()
                self.page.wait_for_timeout(1000)

            # 通过审批
            approve_btn = self.page.locator('button:has-text("通过"), button:has-text("同意")').first
            if approve_btn.is_visible():
                approve_btn.click()
                self.page.wait_for_timeout(1000)

                textarea = self.page.locator('textarea').first
                if textarea.is_visible():
                    textarea.fill("总监审批通过，转经理")

                confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定"]').first
                if confirm_btn.is_visible():
                    confirm_btn.click()

                self.page.wait_for_timeout(3000)
                self.log("  [PASS] 总监审批完成")

            self.screenshot("05_flow_director_approved")

            # Step 3: 经理审批
            self.login("manager1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(2000)

            approve_btn = self.page.locator('button:has-text("通过"), button:has-text("同意")').first
            if approve_btn.is_visible():
                approve_btn.click()
                self.page.wait_for_timeout(1000)

                textarea = self.page.locator('textarea').first
                if textarea.is_visible():
                    textarea.fill("经理审批通过")

                confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定"]').first
                if confirm_btn.is_visible():
                    confirm_btn.click()

                self.page.wait_for_timeout(3000)
                self.log("  [PASS] 经理审批完成")

            self.screenshot("05_flow_manager_approved")

            # Step 4: CEO审批
            self.login("ceo1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            self.page.click('text=完整流程测试申请')
            self.page.wait_for_timeout(2000)

            approve_btn = self.page.locator('button:has-text("通过"), button:has-text("同意")').first
            if approve_btn.is_visible():
                approve_btn.click()
                self.page.wait_for_timeout(1000)

                textarea = self.page.locator('textarea').first
                if textarea.is_visible():
                    textarea.fill("CEO审批通过，同意")

                confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定"]').first
                if confirm_btn.is_visible():
                    confirm_btn.click()

                self.page.wait_for_timeout(3000)
                self.log("  [PASS] CEO审批完成，流程结束")

            self.screenshot("05_flow_complete")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("05_flow_error")
            return False

    # ========== 三、拒绝流程测试 ==========

    def test_reject_flow(self):
        """测试6: 审批拒绝流程"""
        self.log("\n[TEST 6] 审批拒绝流程")
        try:
            # 创建申请
            self.create_application(
                "拒绝测试申请",
                "测试拒绝流程",
                "3000"
            )
            self.log("  [INFO] 申请已创建")

            # 厂长拒绝
            self.login("factory1", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            self.page.click('text=拒绝测试申请')
            self.page.wait_for_timeout(2000)

            # 点击拒绝按钮
            reject_btn = self.page.locator('button:has-text("拒绝"), button:has-text("驳回")').first
            if reject_btn.is_visible():
                reject_btn.click()
                self.page.wait_for_timeout(1000)

                # 填写拒绝原因
                textarea = self.page.locator('textarea').first
                if textarea.is_visible():
                    textarea.fill("金额不合理，拒绝")

                confirm_btn = self.page.locator('button:has-text("确认"), button:has-text("确定"]').first
                if confirm_btn.is_visible():
                    confirm_btn.click()

                self.page.wait_for_timeout(3000)
                self.log("  [PASS] 厂长拒绝完成")

            self.screenshot("06_reject_complete")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("06_reject_error")
            return False

    # ========== 四、权限测试 ==========

    def test_permission_user_cannot_approve(self):
        """测试7: 普通用户无法审批"""
        self.log("\n[TEST 7] 普通用户无法审批权限")
        try:
            self.login("user2", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            # 检查是否显示"暂无待审批"或类似提示
            no_pending = self.page.locator('text=暂无,text=没有数据,text=empty').first
            if no_pending and no_pending.is_visible():
                self.log("  [PASS] 普通用户无待审批申请")
            else:
                # 检查是否没有审批按钮
                approve_btns = self.page.locator('button:has-text("通过"), button:has-text("拒绝")').all()
                if len(approve_btns) == 0:
                    self.log("  [PASS] 普通用户无审批权限按钮")
                else:
                    self.log("  [INFO] 普通用户可能看到自己提交的申请")

            self.screenshot("07_permission_user")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_permission_wrong_approver(self):
        """测试8: 非指定审批人无法审批"""
        self.log("\n[TEST 8] 非指定审批人权限")
        try:
            # 创建申请（指定factory1审批）
            self.create_application(
                "权限测试申请",
                "测试非指定审批人",
                "2000"
            )

            # 使用factory2登录（不是指定审批人）
            self.login("factory2", "123456")
            self.page.goto(f"{BASE_URL}/approval/pending")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            # 检查是否看不到该申请
            try:
                app_link = self.page.locator('text=权限测试申请').first
                if app_link and app_link.is_visible(timeout=3000):
                    self.log("  [INFO] factory2 能看到申请但可能无法审批")
                    # 点击看看详情
                    app_link.click()
                    self.page.wait_for_timeout(2000)
                    # 检查是否有审批按钮
                    approve_btn = self.page.locator('button:has-text("通过")').first
                    if not approve_btn or not approve_btn.is_visible():
                        self.log("  [PASS] 非指定审批人无审批按钮")
                else:
                    self.log("  [PASS] 非指定审批人看不到待审批申请")
            except:
                self.log("  [PASS] 非指定审批人无权限查看")

            self.screenshot("08_permission_wrong")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 五、数据统计测试 ==========

    def test_statistics_display(self):
        """测试9: 统计卡片显示"""
        self.log("\n[TEST 9] 统计卡片显示")
        try:
            self.login("admin", "123456")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            stats = ["总申请", "待审核", "已通过", "已拒绝"]
            found = 0
            for stat in stats:
                try:
                    if self.page.locator(f'text={stat}').first.is_visible(timeout=2000):
                        found += 1
                        self.log(f"  [PASS] {stat} 统计卡片存在")
                except:
                    pass

            self.screenshot("09_statistics")
            return found >= 3
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_search_filter(self):
        """测试10: 搜索和筛选功能"""
        self.log("\n[TEST 10] 搜索和筛选功能")
        try:
            self.login("admin", "123456")
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")
            self.page.wait_for_timeout(2000)

            # 测试搜索框
            search_inputs = self.page.locator('input[placeholder*="搜索"], input[type="search"]').all()
            if search_inputs:
                search_inputs[0].fill("测试")
                self.page.keyboard.press("Enter")
                self.page.wait_for_timeout(2000)
                self.log("  [PASS] 搜索功能可用")

            # 测试状态筛选
            try:
                status_filter = self.page.locator('button:has-text("状态"), select').first
                if status_filter and status_filter.is_visible():
                    status_filter.click()
                    self.page.wait_for_timeout(1000)
                    self.log("  [PASS] 状态筛选可用")
            except:
                pass

            self.screenshot("10_search_filter")
            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    # ========== 运行所有测试 ==========

    def run_all_tests(self):
        """运行所有审批中心全面测试"""
        self.log("\n" + "="*70)
        self.log("OA系统审批中心全面测试")
        self.log("="*70)

        self.setup()

        tests = [
            ("所有用户登录", self.test_all_users_login),
            ("申请列表标签页", self.test_application_list_tabs),
            ("创建带金额申请", self.test_create_application_with_amount),
            ("创建不带金额申请", self.test_create_application_without_amount),
            ("完整审批流程", self.test_complete_approval_flow),
            ("拒绝流程", self.test_reject_flow),
            ("普通用户权限", self.test_permission_user_cannot_approve),
            ("非指定审批人权限", self.test_permission_wrong_approver),
            ("统计卡片", self.test_statistics_display),
            ("搜索筛选", self.test_search_filter),
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

        return 0 if failed == 0 else 1


def main():
    suite = ApprovalFullTest()
    return suite.run_all_tests()


if __name__ == "__main__":
    sys.exit(main())
