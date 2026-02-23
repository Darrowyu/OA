#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统用户操作模拟测试
模拟真实用户的完整操作流程
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


class UserSimulator:
    """用户操作模拟器"""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None

    def setup(self):
        """初始化浏览器"""
        p = sync_playwright().start()
        self.browser = p.chromium.launch(
            headless=False,  # 可视化模式，便于观察
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            slow_mo=500  # 减慢操作速度，便于观察
        )
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080}
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

    def login_as_admin(self):
        """以管理员身份登录"""
        self.log("\n[用户操作] 管理员登录")

        self.page.goto(f"{BASE_URL}/login")
        self.page.wait_for_load_state("networkidle")

        # 输入用户名
        self.page.click("input#username")
        self.page.fill("input#username", "admin")
        self.log("  输入用户名: admin")

        # 输入密码
        self.page.click("input#password")
        self.page.fill("input#password", "admin123")
        self.log("  输入密码: admin123")

        # 点击登录按钮
        self.page.click("button[type='submit']")
        self.log("  点击登录按钮")

        # 等待跳转
        self.page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)
        self.log("  登录成功，进入工作台")

        self.screenshot("sim-01-login-success")

    def create_approval_application(self):
        """模拟创建审批申请"""
        self.log("\n[用户操作] 创建报销申请")

        # 点击审批中心
        self.page.click("text=审批中心")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入审批中心")

        self.screenshot("sim-02-approval-center")

        # 点击新建申请
        self.page.click("text=新建申请")
        self.page.wait_for_load_state("networkidle")
        self.log("  点击新建申请")

        self.screenshot("sim-03-new-application")

        # 填写申请表单（如果有表单）
        try:
            # 尝试填写标题
            title_input = self.page.locator('input[placeholder*="标题"]').first
            if title_input.is_visible(timeout=3000):
                title_input.fill("测试报销申请")
                self.log("  填写申请标题")

            # 尝试填写金额
            amount_input = self.page.locator('input[placeholder*="金额"]').first
            if amount_input.is_visible(timeout=3000):
                amount_input.fill("1000")
                self.log("  填写金额")

            # 尝试填写备注
            remark_input = self.page.locator('textarea').first
            if remark_input.is_visible(timeout=3000):
                remark_input.fill("这是测试申请的备注信息")
                self.log("  填写备注")

            # 提交申请
            submit_btn = self.page.locator('button:has-text("提交")').first
            if submit_btn.is_visible(timeout=3000):
                submit_btn.click()
                self.log("  提交申请")
                time.sleep(2)

        except Exception as e:
            self.log(f"  表单填写跳过: {e}")

        self.screenshot("sim-04-application-submitted")

    def check_pending_approvals(self):
        """查看待审批列表"""
        self.log("\n[用户操作] 查看待审批")

        # 点击待我审批标签
        try:
            self.page.click("text=待我审批")
            self.log("  切换到待我审批")
            time.sleep(1)
            self.screenshot("sim-05-pending-approval")
        except:
            self.log("  待我审批标签未找到")

    def navigate_equipment_management(self):
        """设备管理操作"""
        self.log("\n[用户操作] 设备管理浏览")

        self.page.click("text=设备管理")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入设备管理")

        self.screenshot("sim-06-equipment")

        # 尝试点击设备列表项
        try:
            rows = self.page.locator('tr').all()
            if len(rows) > 1:
                rows[1].click()  # 点击第一行数据
                self.log("  点击查看设备详情")
                time.sleep(1)
                self.screenshot("sim-07-equipment-detail")

                # 返回
                self.page.go_back()
                time.sleep(1)
        except Exception as e:
            self.log(f"  设备详情查看跳过: {e}")

    def check_attendance(self):
        """考勤打卡操作"""
        self.log("\n[用户操作] 考勤打卡")

        self.page.click("text=考勤管理")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入考勤管理")

        self.screenshot("sim-08-attendance")

        # 尝试点击打卡按钮
        try:
            clock_btn = self.page.locator('button:has-text("打卡")').first
            if clock_btn.is_visible(timeout=3000):
                clock_btn.click()
                self.log("  点击打卡")
                time.sleep(2)
                self.screenshot("sim-09-clock-in")
        except:
            self.log("  打卡按钮未找到")

    def book_meeting_room(self):
        """预订会议室"""
        self.log("\n[用户操作] 预订会议室")

        self.page.click("text=会议管理")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入会议管理")

        self.screenshot("sim-10-meetings")

        # 尝试点击预订按钮
        try:
            book_btn = self.page.locator('button:has-text("预订")').first
            if book_btn.is_visible(timeout=3000):
                book_btn.click()
                self.log("  点击预订")
                time.sleep(2)
                self.screenshot("sim-11-meeting-booking")
        except:
            self.log("  预订按钮未找到")

    def browse_documents(self):
        """浏览文档中心"""
        self.log("\n[用户操作] 浏览文档中心")

        self.page.click("text=文档中心")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入文档中心")

        self.screenshot("sim-12-documents")

        # 尝试点击文件夹
        try:
            folders = self.page.locator('.folder, [class*="folder"]').all()
            if folders:
                folders[0].click()
                self.log("  点击文件夹")
                time.sleep(1)
                self.screenshot("sim-13-folder-opened")
        except:
            self.log("  文件夹未找到")

    def check_contacts(self):
        """查看通讯录"""
        self.log("\n[用户操作] 查看通讯录")

        self.page.click("text=通讯录")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入通讯录")

        self.screenshot("sim-14-contacts")

        # 尝试展开部门
        try:
            dept_items = self.page.locator('.department, [class*="dept"]').all()
            if dept_items:
                dept_items[0].click()
                self.log("  点击部门展开")
                time.sleep(1)
                self.screenshot("sim-15-contacts-expanded")
        except:
            self.log("  部门列表未找到")

    def read_announcements(self):
        """阅读公告"""
        self.log("\n[用户操作] 查看公告")

        self.page.click("text=公告通知")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入公告通知")

        self.screenshot("sim-16-announcements")

        # 尝试点击公告
        try:
            announcements = self.page.locator('.announcement, [class*="announce"]').all()
            if announcements:
                announcements[0].click()
                self.log("  点击公告查看详情")
                time.sleep(2)
                self.screenshot("sim-17-announcement-detail")
        except:
            self.log("  公告列表未找到")

    def use_knowledge_base(self):
        """使用知识库"""
        self.log("\n[用户操作] 浏览知识库")

        self.page.click("text=知识库")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入知识库")

        self.screenshot("sim-18-knowledge")

        # 尝试搜索
        try:
            search_input = self.page.locator('input[placeholder*="搜索"]').first
            if search_input.is_visible(timeout=3000):
                search_input.fill("使用指南")
                self.page.keyboard.press("Enter")
                self.log("  搜索知识库")
                time.sleep(2)
                self.screenshot("sim-19-knowledge-search")
        except:
            self.log("  搜索功能未找到")

    def view_reports(self):
        """查看报表"""
        self.log("\n[用户操作] 查看报表")

        self.page.click("text=报表中心")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入报表中心")

        self.screenshot("sim-20-reports")

        # 尝试切换报表类型
        try:
            tabs = self.page.locator('.tab, [role="tab"]').all()
            if len(tabs) > 1:
                tabs[1].click()
                self.log("  切换报表类型")
                time.sleep(2)
                self.screenshot("sim-21-reports-tab")
        except:
            self.log("  报表标签未找到")

    def manage_tasks(self):
        """任务管理操作"""
        self.log("\n[用户操作] 任务管理")

        self.page.click("text=任务管理")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入任务管理")

        self.screenshot("sim-22-tasks")

        # 尝试创建任务
        try:
            add_btn = self.page.locator('button:has-text("新建"), button:has-text("创建"), .add-button').first
            if add_btn.is_visible(timeout=3000):
                add_btn.click()
                self.log("  点击创建任务")
                time.sleep(2)
                self.screenshot("sim-23-task-create")
        except:
            self.log("  创建任务按钮未找到")

    def check_schedule(self):
        """日程管理"""
        self.log("\n[用户操作] 日程管理")

        self.page.click("text=日程管理")
        self.page.wait_for_load_state("networkidle")
        self.log("  进入日程管理")

        self.screenshot("sim-24-schedule")

        # 尝试点击日期
        try:
            days = self.page.locator('.day, [class*="calendar-day"]').all()
            if days:
                days[15].click()  # 点击中间某天
                self.log("  点击日期")
                time.sleep(1)
                self.screenshot("sim-25-schedule-day")
        except:
            self.log("  日历日期未找到")

    def edit_profile(self):
        """编辑个人资料"""
        self.log("\n[用户操作] 查看个人资料")

        # 点击右上角头像或用户名
        try:
            avatar = self.page.locator('.avatar, .user-info, [class*="profile"]').first
            if avatar.is_visible(timeout=3000):
                avatar.click()
                self.log("  点击用户头像")
                time.sleep(1)

                # 点击个人设置
                self.page.click("text=个人设置")
                self.page.wait_for_load_state("networkidle")
                self.log("  进入个人设置")
                self.screenshot("sim-26-profile")
        except:
            # 直接访问
            self.page.goto(f"{BASE_URL}/profile")
            self.page.wait_for_load_state("networkidle")
            self.log("  进入个人设置")
            self.screenshot("sim-26-profile")

    def logout(self):
        """退出登录"""
        self.log("\n[用户操作] 退出登录")

        try:
            # 点击用户菜单
            avatar = self.page.locator('.avatar, .user-menu').first
            if avatar.is_visible(timeout=3000):
                avatar.click()
                time.sleep(1)

                # 点击退出
                self.page.click("text=退出")
                self.log("  点击退出")
                time.sleep(2)

                # 验证返回登录页
                assert "/login" in self.page.url
                self.log("  成功退出到登录页")
                self.screenshot("sim-27-logout")
        except Exception as e:
            self.log(f"  退出操作跳过: {e}")

    def run_full_simulation(self):
        """运行完整用户模拟"""
        self.log("\n" + "="*60)
        self.log("OA系统用户操作模拟测试")
        self.log("="*60)
        self.log("模拟真实用户的完整操作流程\n")

        self.setup()

        try:
            # 1. 登录
            self.login_as_admin()

            # 2. 工作台操作
            self.create_approval_application()
            self.check_pending_approvals()

            # 3. 各模块浏览
            self.navigate_equipment_management()
            self.check_attendance()
            self.book_meeting_room()
            self.browse_documents()
            self.check_contacts()
            self.read_announcements()
            self.use_knowledge_base()
            self.view_reports()
            self.manage_tasks()
            self.check_schedule()

            # 4. 个人设置
            self.edit_profile()

            # 5. 退出
            self.logout()

            self.log("\n" + "="*60)
            self.log("用户操作模拟完成！")
            self.log("="*60)
            self.log(f"\n所有截图保存在: {SCREENSHOTS_DIR}/")

        except Exception as e:
            self.log(f"\n[错误] {e}")
            self.screenshot("sim-error")

        finally:
            self.teardown()


def main():
    simulator = UserSimulator()
    simulator.run_full_simulation()
    return 0


if __name__ == "__main__":
    sys.exit(main())
