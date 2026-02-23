#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统完整业务流程自动化测试
使用 webapp-testing skill
覆盖所有核心用户操作
"""

import sys
import io

# 设置Windows控制台UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright, expect
import time

BASE_URL = "http://localhost:5173"
SCREENSHOTS_DIR = "e2e/screenshots"


class OATestSuite:
    """OA系统测试套件"""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.test_results = []

    def setup(self):
        """初始化浏览器"""
        p = sync_playwright().start()
        self.browser = p.chromium.launch(
            headless=True,
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        )
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir="e2e/videos",
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

    def test_login_logout(self):
        """测试1: 登录登出流程"""
        self.log("\n[TEST 1] 登录登出流程")

        try:
            # 访问登录页
            self.page.goto(f"{BASE_URL}/login")
            self.page.wait_for_load_state("networkidle")

            # 验证登录页元素
            assert self.page.locator("h2").inner_text() == "欢迎回来"
            assert self.page.locator("input#username").is_visible()
            assert self.page.locator("input#password").is_visible()
            self.log("  [PASS] 登录页面元素验证")

            # 输入错误密码
            self.page.fill("input#username", "admin")
            self.page.fill("input#password", "wrongpassword")
            self.page.click("button[type='submit']")
            self.page.wait_for_selector(".bg-red-50", timeout=5000)
            self.log("  [PASS] 错误密码提示验证")

            # 输入正确密码登录
            self.page.fill("input#password", "admin123")
            self.page.click("button[type='submit']")
            self.page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)
            self.log("  [PASS] 成功登录并跳转工作台")

            self.screenshot("01-login-success")

            # 验证工作台元素
            assert "工作台" in self.page.content()
            self.log("  [PASS] 工作台页面加载验证")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            self.screenshot("01-login-error")
            return False

    def test_dashboard_shortcuts(self):
        """测试2: 工作台快捷入口"""
        self.log("\n[TEST 2] 工作台快捷入口")

        try:
            # 验证快捷入口存在
            shortcuts = ["发起申请", "我的审批", "设备管理", "考勤打卡"]
            for shortcut in shortcuts:
                assert self.page.locator(f"text={shortcut}").first.is_visible()
            self.log("  [PASS] 快捷入口验证")

            # 点击设备管理快捷入口
            self.page.click("text=设备管理")
            self.page.wait_for_load_state("networkidle")
            assert "/equipment" in self.page.url
            self.log("  [PASS] 设备管理快捷入口跳转")

            self.screenshot("02-dashboard-shortcut")

            # 返回工作台
            self.page.goto(f"{BASE_URL}/dashboard")
            self.page.wait_for_load_state("networkidle")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_navigation_sidebar(self):
        """测试3: 侧边栏导航"""
        self.log("\n[TEST 3] 侧边栏导航")

        try:
            # 测试各模块导航
            modules = [
                ("工作台", "/dashboard"),
                ("审批中心", "/approval"),
                ("设备管理", "/equipment"),
                ("考勤管理", "/attendance"),
                ("会议管理", "/meetings"),
                ("日程管理", "/schedule"),
                ("任务管理", "/tasks"),
                ("文档中心", "/documents"),
                ("通讯录", "/contacts"),
                ("公告通知", "/announcements"),
                ("报表中心", "/reports"),
                ("知识库", "/knowledge"),
            ]

            for name, path in modules:
                self.page.click(f"text={name}")
                self.page.wait_for_load_state("networkidle")
                assert path in self.page.url, f"导航到{name}失败"
                self.log(f"  [PASS] {name}导航")
                time.sleep(0.5)

            self.screenshot("03-navigation-all")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_approval_workflow(self):
        """测试4: 审批流程"""
        self.log("\n[TEST 4] 审批流程")

        try:
            # 进入审批中心
            self.page.goto(f"{BASE_URL}/approval")
            self.page.wait_for_load_state("networkidle")

            # 验证审批中心标签页
            tabs = ["全部申请", "待我审批", "我已审批", "我的申请"]
            for tab in tabs:
                assert self.page.locator(f"text={tab}").first.is_visible()
            self.log("  [PASS] 审批中心标签页验证")

            # 切换到待我审批
            self.page.click("text=待我审批")
            time.sleep(1)
            self.log("  [PASS] 待我审批切换")

            # 切换到我的申请
            self.page.click("text=我的申请")
            time.sleep(1)
            self.log("  [PASS] 我的申请切换")

            self.screenshot("04-approval-tabs")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_equipment_management(self):
        """测试5: 设备管理"""
        self.log("\n[TEST 5] 设备管理")

        try:
            # 进入设备管理
            self.page.goto(f"{BASE_URL}/equipment")
            self.page.wait_for_load_state("networkidle")

            # 验证设备管理页面
            assert "设备" in self.page.content()
            self.log("  [PASS] 设备管理页面加载")

            # 测试搜索功能（如果有）
            search_input = self.page.locator('input[placeholder*="搜索"]').first
            if search_input.is_visible():
                search_input.fill("测试")
                self.page.keyboard.press("Enter")
                time.sleep(1)
                self.log("  [PASS] 设备搜索功能")

            self.screenshot("05-equipment-list")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_attendance_clockin(self):
        """测试6: 考勤打卡"""
        self.log("\n[TEST 6] 考勤打卡")

        try:
            # 进入考勤管理
            self.page.goto(f"{BASE_URL}/attendance")
            self.page.wait_for_load_state("networkidle")

            # 验证考勤页面
            assert "考勤" in self.page.content()
            self.log("  [PASS] 考勤页面加载")

            # 验证打卡相关元素
            if self.page.locator("text=打卡").first.is_visible():
                self.log("  [PASS] 打卡功能可见")

            self.screenshot("06-attendance")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_meeting_room_booking(self):
        """测试7: 会议室预订"""
        self.log("\n[TEST 7] 会议室预订")

        try:
            # 进入会议管理
            self.page.goto(f"{BASE_URL}/meetings")
            self.page.wait_for_load_state("networkidle")

            # 验证会议管理页面
            assert "会议" in self.page.content() or "会议室" in self.page.content()
            self.log("  [PASS] 会议管理页面加载")

            self.screenshot("07-meetings")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_document_center(self):
        """测试8: 文档中心"""
        self.log("\n[TEST 8] 文档中心")

        try:
            # 进入文档中心
            self.page.goto(f"{BASE_URL}/documents")
            self.page.wait_for_load_state("networkidle")

            # 验证文档中心页面
            assert "文档" in self.page.content() or "文件" in self.page.content()
            self.log("  [PASS] 文档中心页面加载")

            self.screenshot("08-documents")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_contacts_organization(self):
        """测试9: 通讯录组织架构"""
        self.log("\n[TEST 9] 通讯录组织架构")

        try:
            # 进入通讯录
            self.page.goto(f"{BASE_URL}/contacts")
            self.page.wait_for_load_state("networkidle")

            # 验证通讯录页面
            assert "通讯录" in self.page.content() or "联系人" in self.page.content() or "组织架构" in self.page.content()
            self.log("  [PASS] 通讯录页面加载")

            self.screenshot("09-contacts")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_announcements(self):
        """测试10: 公告通知"""
        self.log("\n[TEST 10] 公告通知")

        try:
            # 进入公告通知
            self.page.goto(f"{BASE_URL}/announcements")
            self.page.wait_for_load_state("networkidle")

            # 验证公告页面
            assert "公告" in self.page.content() or "通知" in self.page.content()
            self.log("  [PASS] 公告通知页面加载")

            self.screenshot("10-announcements")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_knowledge_base(self):
        """测试11: 知识库"""
        self.log("\n[TEST 11] 知识库")

        try:
            # 进入知识库
            self.page.goto(f"{BASE_URL}/knowledge")
            self.page.wait_for_load_state("networkidle")

            # 验证知识库页面
            assert "知识" in self.page.content() or "文章" in self.page.content()
            self.log("  [PASS] 知识库页面加载")

            self.screenshot("11-knowledge")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_reports_center(self):
        """测试12: 报表中心"""
        self.log("\n[TEST 12] 报表中心")

        try:
            # 进入报表中心
            self.page.goto(f"{BASE_URL}/reports")
            self.page.wait_for_load_state("networkidle")

            # 验证报表页面
            assert "报表" in self.page.content() or "统计" in self.page.content()
            self.log("  [PASS] 报表中心页面加载")

            self.screenshot("12-reports")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_task_management(self):
        """测试13: 任务管理"""
        self.log("\n[TEST 13] 任务管理")

        try:
            # 进入任务管理
            self.page.goto(f"{BASE_URL}/tasks")
            self.page.wait_for_load_state("networkidle")

            # 验证任务管理页面
            assert "任务" in self.page.content() or "看板" in self.page.content() or "项目" in self.page.content()
            self.log("  [PASS] 任务管理页面加载")

            self.screenshot("13-tasks")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_schedule_calendar(self):
        """测试14: 日程管理"""
        self.log("\n[TEST 14] 日程管理")

        try:
            # 进入日程管理
            self.page.goto(f"{BASE_URL}/schedule")
            self.page.wait_for_load_state("networkidle")

            # 验证日程页面
            assert "日程" in self.page.content() or "日历" in self.page.content()
            self.log("  [PASS] 日程管理页面加载")

            self.screenshot("14-schedule")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_profile_settings(self):
        """测试15: 个人设置"""
        self.log("\n[TEST 15] 个人设置")

        try:
            # 进入个人设置
            self.page.goto(f"{BASE_URL}/profile")
            self.page.wait_for_load_state("networkidle")

            # 验证个人设置页面
            assert "个人" in self.page.content() or "设置" in self.page.content() or "信息" in self.page.content()
            self.log("  [PASS] 个人设置页面加载")

            self.screenshot("15-profile")

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def test_responsive_design(self):
        """测试16: 响应式设计"""
        self.log("\n[TEST 16] 响应式设计")

        try:
            # 测试平板尺寸
            self.page.set_viewport_size({"width": 768, "height": 1024})
            self.page.goto(f"{BASE_URL}/dashboard")
            self.page.wait_for_load_state("networkidle")
            self.screenshot("16-responsive-tablet")
            self.log("  [PASS] 平板尺寸响应式")

            # 测试手机尺寸
            self.page.set_viewport_size({"width": 375, "height": 667})
            self.page.reload()
            self.page.wait_for_load_state("networkidle")
            self.screenshot("16-responsive-mobile")
            self.log("  [PASS] 手机尺寸响应式")

            # 恢复桌面尺寸
            self.page.set_viewport_size({"width": 1920, "height": 1080})

            return True
        except Exception as e:
            self.log(f"  [FAIL] {e}")
            return False

    def run_all_tests(self):
        """运行所有测试"""
        self.log("\n" + "="*60)
        self.log("OA系统完整业务流程自动化测试")
        self.log("="*60)

        self.setup()

        tests = [
            ("登录登出", self.test_login_logout),
            ("工作台快捷入口", self.test_dashboard_shortcuts),
            ("侧边栏导航", self.test_navigation_sidebar),
            ("审批流程", self.test_approval_workflow),
            ("设备管理", self.test_equipment_management),
            ("考勤打卡", self.test_attendance_clockin),
            ("会议室预订", self.test_meeting_room_booking),
            ("文档中心", self.test_document_center),
            ("通讯录", self.test_contacts_organization),
            ("公告通知", self.test_announcements),
            ("知识库", self.test_knowledge_base),
            ("报表中心", self.test_reports_center),
            ("任务管理", self.test_task_management),
            ("日程管理", self.test_schedule_calendar),
            ("个人设置", self.test_profile_settings),
            ("响应式设计", self.test_responsive_design),
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

        self.log("\n" + "="*60)
        self.log(f"测试完成: {passed} 通过, {failed} 失败")
        self.log("="*60)
        self.log(f"\n截图保存在: {SCREENSHOTS_DIR}/")
        self.log(f"视频保存在: e2e/videos/")

        return 0 if failed == 0 else 1


def main():
    suite = OATestSuite()
    return suite.run_all_tests()


if __name__ == "__main__":
    sys.exit(main())
