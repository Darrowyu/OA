#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统自动化测试 - 使用 webapp-testing skill
测试登录、工作台、导航功能
"""

import sys
import io

# 设置Windows控制台UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"

def test_login_workflow():
    """测试登录流程"""
    print("\n" + "="*60)
    print("OA系统自动化测试")
    print("="*60)

    with sync_playwright() as p:
        # 使用系统 Chrome
        browser = p.chromium.launch(
            headless=True,
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        )
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        try:
            # 测试1: 登录页面
            print("\n[TEST 1] 登录页面显示")
            page.goto(f"{BASE_URL}/login")
            page.wait_for_load_state("networkidle")

            title = page.locator("h2").inner_text()
            assert title == "欢迎回来", f"标题不匹配: {title}"
            print("  [PASS] 登录页面显示正确")

            page.screenshot(path="e2e/screenshots/01-login-page.png", full_page=True)

            # 测试2: 成功登录
            print("\n[TEST 2] 成功登录跳转")
            page.fill("input#username", "admin")
            page.fill("input#password", "admin123")
            page.click("button[type='submit']")

            page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)
            print("  [PASS] 登录成功，已跳转到工作台")

            page.screenshot(path="e2e/screenshots/02-dashboard.png", full_page=True)

            # 测试3: 审批中心
            print("\n[TEST 3] 审批中心导航")
            page.goto(f"{BASE_URL}/approval")
            page.wait_for_load_state("networkidle")
            assert "/approval" in page.url, f"导航失败: {page.url}"
            print("  [PASS] 审批中心导航正常")

            page.screenshot(path="e2e/screenshots/03-approval.png", full_page=True)

            # 测试4: 设备管理
            print("\n[TEST 4] 设备管理导航")
            page.goto(f"{BASE_URL}/equipment")
            page.wait_for_load_state("networkidle")
            assert "/equipment" in page.url, f"导航失败: {page.url}"
            print("  [PASS] 设备管理导航正常")

            page.screenshot(path="e2e/screenshots/04-equipment.png", full_page=True)

            print("\n" + "="*60)
            print("[SUCCESS] 所有测试通过！")
            print("="*60)
            print("\n截图保存在 e2e/screenshots/")

            return 0

        except Exception as e:
            print(f"\n[FAILED] 测试失败: {e}")
            page.screenshot(path="e2e/screenshots/error.png", full_page=True)
            return 1

        finally:
            browser.close()

if __name__ == "__main__":
    sys.exit(test_login_workflow())
