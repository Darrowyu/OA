import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 先创建部门
  const mgmtDept = await prisma.department.upsert({
    where: { code: 'MGMT' },
    update: {},
    create: {
      name: '管理部',
      code: 'MGMT',
      level: 1,
      sortOrder: 1,
      isActive: true,
    },
  });

  const prodDept = await prisma.department.upsert({
    where: { code: 'PROD' },
    update: {},
    create: {
      name: '生产部',
      code: 'PROD',
      level: 1,
      sortOrder: 2,
      isActive: true,
    },
  });

  const techDept = await prisma.department.upsert({
    where: { code: 'TECH' },
    update: {},
    create: {
      name: '技术部',
      code: 'TECH',
      level: 1,
      sortOrder: 3,
      isActive: true,
    },
  });

  const opsDept = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: {
      name: '运营部',
      code: 'OPS',
      level: 1,
      sortOrder: 4,
      isActive: true,
    },
  });

  const ceoDept = await prisma.department.upsert({
    where: { code: 'CEO' },
    update: {},
    create: {
      name: '总经办',
      code: 'CEO',
      level: 1,
      sortOrder: 5,
      isActive: true,
    },
  });

  const salesDept = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: {},
    create: {
      name: '销售部',
      code: 'SALES',
      level: 1,
      sortOrder: 6,
      isActive: true,
    },
  });

  console.log('部门创建成功');

  // 创建管理员
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
      departmentId: mgmtDept.id,
      employeeId: 'EMP001',
      isActive: true,
    },
  });

  console.log('管理员账户创建成功:', admin.username);

  // 创建测试用户
  const users = [
    { username: 'factory1', name: '厂长1', role: 'FACTORY_MANAGER', deptId: prodDept.id, empId: 'EMP002' },
    { username: 'director1', name: '主任1', role: 'DIRECTOR', deptId: techDept.id, empId: 'EMP003' },
    { username: 'manager1', name: '经理1', role: 'MANAGER', deptId: opsDept.id, empId: 'EMP004' },
    { username: 'ceo1', name: 'CEO', role: 'CEO', deptId: ceoDept.id, empId: 'EMP005' },
    { username: 'user1', name: '普通用户', role: 'USER', deptId: salesDept.id, empId: 'EMP006' },
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
        departmentId: user.deptId,
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
