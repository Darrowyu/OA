import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '系统管理员',
      email: 'admin@company.com',
      role: 'ADMIN',
      department: '管理部',
      employeeId: 'EMP001',
      isActive: true,
    },
  });

  console.log('管理员账户创建成功:', admin.username);

  // 创建一些测试用户
  const users = [
    { username: 'factory1', name: '厂长1', role: 'FACTORY_MANAGER', dept: '生产部', empId: 'EMP002' },
    { username: 'director1', name: '主任1', role: 'DIRECTOR', dept: '技术部', empId: 'EMP003' },
    { username: 'manager1', name: '经理1', role: 'MANAGER', dept: '运营部', empId: 'EMP004' },
    { username: 'ceo1', name: 'CEO', role: 'CEO', dept: '总经办', empId: 'EMP005' },
    { username: 'user1', name: '普通用户', role: 'USER', dept: '销售部', empId: 'EMP006' },
  ];

  for (const user of users) {
    const password = await bcrypt.hash('123456', 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: password,
        name: user.name,
        email: `${user.username}@company.com`,
        role: user.role as any,
        department: user.dept,
        employeeId: user.empId,
        isActive: true,
      },
    });
    console.log('用户创建成功:', user.username);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
