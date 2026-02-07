import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 重置所有用户密码
  const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'factory1', password: '123456' },
    { username: 'director1', password: '123456' },
    { username: 'manager1', password: '123456' },
    { username: 'ceo1', password: '123456' },
    { username: 'user1', password: '123456' },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.update({
      where: { username: user.username },
      data: { password: hashedPassword },
    });
    console.log(`密码已重置: ${user.username} -> ${user.password}`);
  }

  console.log('\n所有账户密码已更新！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
