/**
 * 创建审批中心测试用户
 * 密码统一: 123456
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_USERS = [
  { username: 'user1', name: '测试用户1', employeeId: 'E001', role: UserRole.USER },
  { username: 'user2', name: '测试用户2', employeeId: 'E002', role: UserRole.USER },
  { username: 'factory1', name: '张厂长', employeeId: 'F001', role: UserRole.FACTORY_MANAGER },
  { username: 'factory2', name: '李厂长', employeeId: 'F002', role: UserRole.FACTORY_MANAGER },
  { username: 'director1', name: '王总监', employeeId: 'D001', role: UserRole.DIRECTOR },
  { username: 'manager1', name: '刘经理', employeeId: 'M001', role: UserRole.MANAGER },
  { username: 'manager2', name: '陈经理', employeeId: 'M002', role: UserRole.MANAGER },
  { username: 'ceo1', name: '赵总', employeeId: 'C001', role: UserRole.CEO },
  { username: 'admin', name: '管理员', employeeId: 'A001', role: UserRole.ADMIN },
];

const DEFAULT_PASSWORD = '123456';

async function seedTestUsers() {
  console.log('开始创建测试用户...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const user of TEST_USERS) {
    try {
      // 检查用户是否已存在
      const existing = await prisma.user.findUnique({
        where: { username: user.username },
      });

      if (existing) {
        console.log(`[跳过] ${user.username} 已存在`);
        results.skipped++;
        continue;
      }

      // 创建用户（不设置邮箱）
      await prisma.user.create({
        data: {
          username: user.username,
          password: hashedPassword,
          name: user.name,
          employeeId: user.employeeId,
          role: user.role,
          isActive: true,
        },
      });

      console.log(`[创建] ${user.username} (${user.name}) - ${user.role}`);
      results.created++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[错误] ${user.username}: ${msg}`);
      results.errors.push(`${user.username}: ${msg}`);
    }
  }

  console.log('\n========================================');
  console.log('测试用户创建完成!');
  console.log('========================================');
  console.log(`成功: ${results.created}`);
  console.log(`跳过: ${results.skipped}`);
  console.log(`失败: ${results.errors.length}`);
  console.log('\n密码统一为: 123456');

  if (results.errors.length > 0) {
    console.log('\n错误详情:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
}

seedTestUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
