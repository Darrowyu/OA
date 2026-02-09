/**
 * ⚠️ 警告：此脚本仅用于开发/测试环境重置密码
 * 不要在生产环境中使用此脚本！
 * 生产环境应该使用密码重置流程或管理后台修改密码
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 开发环境测试账户密码（仅用于开发环境）
const DEV_USERS = [
  { username: 'admin', password: process.env.DEV_ADMIN_PASSWORD || 'admin123' },
  { username: 'factory1', password: process.env.DEV_USER_PASSWORD || '123456' },
  { username: 'director1', password: process.env.DEV_USER_PASSWORD || '123456' },
  { username: 'manager1', password: process.env.DEV_USER_PASSWORD || '123456' },
  { username: 'ceo1', password: process.env.DEV_USER_PASSWORD || '123456' },
  { username: 'user1', password: process.env.DEV_USER_PASSWORD || '123456' },
];

async function main() {
  // 检查环境
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 错误：不能在生产环境运行此脚本！');
    process.exit(1);
  }

  console.log('⚠️  正在重置开发环境密码...\n');

  for (const user of DEV_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.update({
      where: { username: user.username },
      data: { password: hashedPassword },
    });
    console.log(`✅ 密码已重置: ${user.username}`);
  }

  console.log('\n✅ 所有账户密码已更新！');
  console.log('⚠️  提醒：请在.env文件中设置 DEV_ADMIN_PASSWORD 和 DEV_USER_PASSWORD');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
