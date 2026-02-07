#!/usr/bin/env tsx
/**
 * OA系统数据迁移脚本
 * 从JSON文件迁移数据到PostgreSQL数据库
 *
 * 使用方法:
 * 1. 确保DATABASE_URL环境变量已设置
 * 2. 运行: npx tsx scripts/migrate-data.ts
 */

import { PrismaClient, UserRole, ApplicationStatus, Priority, ApprovalAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// 初始化Prisma客户端
const prisma = new PrismaClient({
  log: ['error'],
});

// 迁移统计
interface MigrationStats {
  users: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  };
  applications: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  };
  startTime: Date;
  endTime?: Date;
}

const stats: MigrationStats = {
  users: { total: 0, success: 0, failed: 0, skipped: 0, errors: [] },
  applications: { total: 0, success: 0, failed: 0, skipped: 0, errors: [] },
  startTime: new Date(),
};

// 源数据文件路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');

// 角色映射: 将JSON中的角色字符串映射到Prisma枚举
const roleMapping: Record<string, UserRole> = {
  'admin': UserRole.ADMIN,
  'user': UserRole.USER,
  'factory_manager': UserRole.FACTORY_MANAGER,
  'factoryManager': UserRole.FACTORY_MANAGER,
  'director': UserRole.DIRECTOR,
  'manager': UserRole.MANAGER,
  'ceo': UserRole.CEO,
  'readonly': UserRole.READONLY,
};

// 状态映射: 将JSON中的状态字符串映射到Prisma枚举
const statusMapping: Record<string, ApplicationStatus> = {
  'draft': ApplicationStatus.DRAFT,
  'pending_factory': ApplicationStatus.PENDING_FACTORY,
  'pendingFactory': ApplicationStatus.PENDING_FACTORY,
  'pending_director': ApplicationStatus.PENDING_DIRECTOR,
  'pendingDirector': ApplicationStatus.PENDING_DIRECTOR,
  'pending_manager': ApplicationStatus.PENDING_MANAGER,
  'pendingManager': ApplicationStatus.PENDING_MANAGER,
  'pending_ceo': ApplicationStatus.PENDING_CEO,
  'pendingCeo': ApplicationStatus.PENDING_CEO,
  'approved': ApplicationStatus.APPROVED,
  'rejected': ApplicationStatus.REJECTED,
  'archived': ApplicationStatus.ARCHIVED,
};

// 优先级映射
const priorityMapping: Record<string, Priority> = {
  'low': Priority.LOW,
  'normal': Priority.NORMAL,
  'high': Priority.HIGH,
  'urgent': Priority.URGENT,
};

// 审批动作映射
const actionMapping: Record<string, ApprovalAction> = {
  'approve': ApprovalAction.APPROVE,
  'approved': ApprovalAction.APPROVE,
  'reject': ApprovalAction.REJECT,
  'rejected': ApprovalAction.REJECT,
  'pending': ApprovalAction.PENDING,
};

/**
 * 检查密码是否已是bcrypt格式
 */
function isBcryptHash(password: string): boolean {
  return password.startsWith('$2') && password.length === 60;
}

/**
 * 加密密码（如果不是bcrypt格式）
 */
async function hashPassword(password: string): Promise<string> {
  if (isBcryptHash(password)) {
    return password; // 已是bcrypt格式，直接返回
  }
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 解析JSON文件
 */
function parseJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T[];
}

/**
 * 生成唯一ID（基于时间戳和随机数）
 */
function generateId(): string {
  return `cuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成申请编号
 */
function generateApplicationNo(index: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = String(index + 1).padStart(4, '0');
  return `APP-${year}${month}${day}-${sequence}`;
}

/**
 * 安全解析日期
 */
function parseDate(dateValue: unknown): Date | undefined {
  if (!dateValue) return undefined;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

/**
 * 打印进度条
 */
function printProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  process.stdout.write(`\r${label}: [${bar}] ${percentage}% (${current}/${total})`);
}

/**
 * 迁移用户数据
 */
async function migrateUsers(): Promise<Map<string, string>> {
  console.log('\n📦 开始迁移用户数据...\n');

  const userIdMap = new Map<string, string>(); // 旧ID/用户名 -> 新ID

  try {
    const users = parseJsonFile<{
      id?: string | number;
      username?: string;
      password?: string;
      role?: string;
      email?: string;
      department?: string;
      userCode?: string;
      employeeId?: string;
      name?: string;
      isActive?: boolean;
      signature?: string;
    }>(USERS_FILE);

    stats.users.total = users.length;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      printProgress(i + 1, users.length, '用户迁移');

      try {
        // 验证必需字段
        if (!user.username) {
          stats.users.skipped++;
          stats.users.errors.push(`第${i + 1}个用户: 缺少用户名`);
          continue;
        }

        // 处理密码
        const password = user.password || 'defaultPassword123';
        const hashedPassword = await hashPassword(password);

        // 映射角色
        const role = roleMapping[user.role?.toLowerCase() || 'user'] || UserRole.USER;

        // 构建用户数据
        const userData = {
          username: user.username,
          password: hashedPassword,
          name: user.name || user.username,
          email: user.email || `${user.username}@example.com`,
          role: role,
          department: user.department || '未分配',
          employeeId: user.userCode || user.employeeId || user.username,
          isActive: user.isActive !== false,
        };

        // 使用upsert避免重复
        const upsertedUser = await prisma.user.upsert({
          where: { username: user.username },
          update: userData,
          create: userData,
        });

        // 记录ID映射
        const oldId = user.id?.toString() || user.username;
        userIdMap.set(oldId, upsertedUser.id);
        userIdMap.set(user.username, upsertedUser.id);

        stats.users.success++;
      } catch (error) {
        stats.users.failed++;
        const errorMsg = `用户 "${user.username}": ${error instanceof Error ? error.message : '未知错误'}`;
        stats.users.errors.push(errorMsg);
      }
    }

    console.log('\n'); // 换行
  } catch (error) {
    console.error('读取用户数据文件失败:', error);
    throw error;
  }

  return userIdMap;
}

/**
 * 迁移申请数据
 */
async function migrateApplications(userIdMap: Map<string, string>): Promise<void> {
  console.log('\n📄 开始迁移申请数据...\n');

  try {
    const applications = parseJsonFile<{
      id?: string | number;
      applicationNo?: string;
      title?: string;
      content?: string;
      amount?: string | number;
      currency?: string;
      priority?: string;
      status?: string;
      applicant?: string;
      applicantName?: string;
      applicantDept?: string;
      department?: string;
      username?: string;
      date?: string;
      submittedAt?: string;
      completedAt?: string;
      rejectedAt?: string;
      rejectReason?: string;
      rejectedBy?: string;
      factoryManagerIds?: string[];
      managerIds?: string[];
      attachments?: Array<{
        name?: string;
        path?: string;
        filename?: string;
        storedName?: string;
        size?: number;
        mimeType?: string;
      }>;
      approvals?: {
        directors?: Record<string, {
          status?: string;
          comment?: string;
          date?: string;
          attachments?: unknown[];
        }>;
        managers?: Record<string, {
          status?: string;
          comment?: string;
          date?: string;
        }>;
        factoryManagers?: Record<string, {
          status?: string;
          comment?: string;
          date?: string;
        }>;
        ceo?: Record<string, {
          status?: string;
          comment?: string;
          date?: string;
        }>;
      };
    }>(APPLICATIONS_FILE);

    stats.applications.total = applications.length;

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      printProgress(i + 1, applications.length, '申请迁移');

      try {
        // 查找申请人
        const applicantIdentifier = app.username || app.applicant;
        if (!applicantIdentifier) {
          stats.applications.skipped++;
          stats.applications.errors.push(`第${i + 1}个申请: 缺少申请人信息`);
          continue;
        }

        const applicantId = userIdMap.get(applicantIdentifier);
        if (!applicantId) {
          stats.applications.skipped++;
          stats.applications.errors.push(`申请 "${app.title || app.id}": 找不到申请人 "${applicantIdentifier}"`);
          continue;
        }

        // 获取申请人信息
        const applicant = await prisma.user.findUnique({
          where: { id: applicantId },
        });

        if (!applicant) {
          stats.applications.skipped++;
          stats.applications.errors.push(`申请 "${app.title || app.id}": 申请人不存在`);
          continue;
        }

        // 映射状态
        const status = statusMapping[app.status?.toLowerCase() || 'draft'] || ApplicationStatus.DRAFT;

        // 映射优先级
        const priority = priorityMapping[app.priority?.toLowerCase() || 'normal'] || Priority.NORMAL;

        // 处理金额
        let amount: number | null = null;
        if (app.amount !== undefined && app.amount !== null && app.amount !== '') {
          const parsedAmount = typeof app.amount === 'string'
            ? parseFloat(app.amount.replace(/[^0-9.-]/g, ''))
            : Number(app.amount);
          if (!isNaN(parsedAmount)) {
            amount = parsedAmount;
          }
        }

        // 生成申请编号
        const applicationNo = app.applicationNo || generateApplicationNo(i);

        // 构建申请数据
        const applicationData = {
          applicationNo: applicationNo,
          title: app.title || '无标题申请',
          content: app.content || '',
          amount: amount,
          priority: priority,
          status: status,
          applicantId: applicantId,
          applicantName: app.applicantName || app.applicant || applicant.name,
          applicantDept: app.applicantDept || app.department || applicant.department,
          factoryManagerIds: app.factoryManagerIds || [],
          managerIds: app.managerIds || [],
          rejectedBy: app.rejectedBy,
          rejectedAt: parseDate(app.rejectedAt),
          rejectReason: app.rejectReason,
          submittedAt: parseDate(app.submittedAt || app.date),
          completedAt: parseDate(app.completedAt),
        };

        // 使用upsert避免重复
        const upsertedApp = await prisma.application.upsert({
          where: { applicationNo: applicationNo },
          update: applicationData,
          create: applicationData,
        });

        // 迁移附件
        if (app.attachments && app.attachments.length > 0) {
          for (const attachment of app.attachments) {
            try {
              const fileName = attachment.name || attachment.filename || 'unknown';
              const storedName = attachment.path || attachment.storedName || fileName;

              await prisma.attachment.create({
                data: {
                  filename: fileName,
                  storedName: storedName,
                  path: `uploads/${storedName}`,
                  size: attachment.size || 0,
                  mimeType: attachment.mimeType || 'application/octet-stream',
                  applicationId: upsertedApp.id,
                  uploaderId: applicantId,
                  isApprovalAttachment: false,
                },
              });
            } catch (attachError) {
              // 附件错误不中断主流程
              console.warn(`\n  警告: 申请 "${applicationNo}" 的附件迁移失败: ${attachError instanceof Error ? attachError.message : '未知错误'}`);
            }
          }
        }

        // 迁移审批记录
        if (app.approvals) {
          // 厂长审批
          if (app.approvals.factoryManagers) {
            for (const [approverName, approval] of Object.entries(app.approvals.factoryManagers)) {
              const approverId = userIdMap.get(approverName);
              if (approverId) {
                await prisma.factoryApproval.upsert({
                  where: {
                    applicationId_approverId: {
                      applicationId: upsertedApp.id,
                      approverId: approverId,
                    },
                  },
                  update: {
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                  create: {
                    applicationId: upsertedApp.id,
                    approverId: approverId,
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                });
              }
            }
          }

          // 总监审批
          if (app.approvals.directors) {
            for (const [approverName, approval] of Object.entries(app.approvals.directors)) {
              const approverId = userIdMap.get(approverName);
              if (approverId) {
                await prisma.directorApproval.upsert({
                  where: {
                    applicationId_approverId: {
                      applicationId: upsertedApp.id,
                      approverId: approverId,
                    },
                  },
                  update: {
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                  create: {
                    applicationId: upsertedApp.id,
                    approverId: approverId,
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                });
              }
            }
          }

          // 经理审批
          if (app.approvals.managers) {
            for (const [approverName, approval] of Object.entries(app.approvals.managers)) {
              const approverId = userIdMap.get(approverName);
              if (approverId) {
                await prisma.managerApproval.upsert({
                  where: {
                    applicationId_approverId: {
                      applicationId: upsertedApp.id,
                      approverId: approverId,
                    },
                  },
                  update: {
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                  create: {
                    applicationId: upsertedApp.id,
                    approverId: approverId,
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                });
              }
            }
          }

          // CEO审批
          if (app.approvals.ceo) {
            for (const [approverName, approval] of Object.entries(app.approvals.ceo)) {
              const approverId = userIdMap.get(approverName);
              if (approverId) {
                await prisma.ceoApproval.upsert({
                  where: {
                    applicationId_approverId: {
                      applicationId: upsertedApp.id,
                      approverId: approverId,
                    },
                  },
                  update: {
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                  create: {
                    applicationId: upsertedApp.id,
                    approverId: approverId,
                    action: actionMapping[approval.status?.toLowerCase() || 'pending'] || ApprovalAction.PENDING,
                    comment: approval.comment,
                    approvedAt: parseDate(approval.date),
                  },
                });
              }
            }
          }
        }

        stats.applications.success++;
      } catch (error) {
        stats.applications.failed++;
        const errorMsg = `申请 "${app.title || app.id}": ${error instanceof Error ? error.message : '未知错误'}`;
        stats.applications.errors.push(errorMsg);
      }
    }

    console.log('\n'); // 换行
  } catch (error) {
    console.error('读取申请数据文件失败:', error);
    throw error;
  }
}

/**
 * 打印迁移报告
 */
function printReport(): void {
  stats.endTime = new Date();
  const duration = stats.endTime.getTime() - stats.startTime.getTime();
  const durationSec = (duration / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 数据迁移报告');
  console.log('='.repeat(60));
  console.log(`⏱️  执行时间: ${durationSec} 秒`);
  console.log('');

  // 用户统计
  console.log('👤 用户迁移统计:');
  console.log(`   总数: ${stats.users.total}`);
  console.log(`   成功: ${stats.users.success} ✅`);
  console.log(`   失败: ${stats.users.failed} ❌`);
  console.log(`   跳过: ${stats.users.skipped} ⚠️`);

  // 申请统计
  console.log('\n📝 申请迁移统计:');
  console.log(`   总数: ${stats.applications.total}`);
  console.log(`   成功: ${stats.applications.success} ✅`);
  console.log(`   失败: ${stats.applications.failed} ❌`);
  console.log(`   跳过: ${stats.applications.skipped} ⚠️`);

  // 错误详情
  const totalErrors = stats.users.errors.length + stats.applications.errors.length;
  if (totalErrors > 0) {
    console.log('\n❌ 错误详情:');

    if (stats.users.errors.length > 0) {
      console.log('\n   用户错误:');
      stats.users.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
      if (stats.users.errors.length > 10) {
        console.log(`   ... 还有 ${stats.users.errors.length - 10} 个错误`);
      }
    }

    if (stats.applications.errors.length > 0) {
      console.log('\n   申请错误:');
      stats.applications.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
      if (stats.applications.errors.length > 10) {
        console.log(`   ... 还有 ${stats.applications.errors.length - 10} 个错误`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  // 总结
  const totalSuccess = stats.users.success + stats.applications.success;
  const totalFailed = stats.users.failed + stats.applications.failed;
  const totalSkipped = stats.users.skipped + stats.applications.skipped;

  if (totalFailed === 0 && totalSkipped === 0) {
    console.log('✅ 所有数据迁移成功！');
  } else if (totalFailed === 0) {
    console.log('⚠️  部分数据被跳过，但无错误');
  } else {
    console.log(`❌ 迁移完成，但有 ${totalFailed} 个错误`);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('\n🚀 OA系统数据迁移工具');
  console.log('='.repeat(60));
  console.log(`开始时间: ${stats.startTime.toLocaleString()}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log('='.repeat(60));

  try {
    // 检查数据文件
    if (!fs.existsSync(USERS_FILE)) {
      throw new Error(`用户数据文件不存在: ${USERS_FILE}`);
    }
    if (!fs.existsSync(APPLICATIONS_FILE)) {
      throw new Error(`申请数据文件不存在: ${APPLICATIONS_FILE}`);
    }

    // 先迁移用户（获取ID映射）
    const userIdMap = await migrateUsers();

    // 再迁移申请
    await migrateApplications(userIdMap);

    // 打印报告
    printReport();

    // 根据结果设置退出码
    const totalFailed = stats.users.failed + stats.applications.failed;
    process.exit(totalFailed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 迁移失败:', error instanceof Error ? error.message : error);
    printReport();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行主函数
main();
