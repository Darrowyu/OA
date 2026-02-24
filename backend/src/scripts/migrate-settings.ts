/**
 * 系统设置数据迁移脚本
 * 从 EmailSettings 和 SystemSettings 迁移数据到新模型 (ConfigCategory, SystemConfig)
 *
 * 使用方法:
 *   npx tsx src/scripts/migrate-settings.ts [--dry-run]
 *
 * 选项:
 *   --dry-run  预览迁移结果，不实际写入数据库
 */

import prisma from '@/lib/prisma';
import { ConfigValueType } from '@prisma/client';

interface MigrationResult {
  success: boolean;
  categoriesCreated: number;
  configsMigrated: number;
  configsSkipped: number;
  errors: string[];
}

// 配置分类定义
const DEFAULT_CATEGORIES = [
  {
    code: 'system',
    name: '系统基础',
    description: '系统基础配置，如名称、Logo、时区等',
    icon: 'Settings',
    sortOrder: 1,
  },
  {
    code: 'security',
    name: '安全设置',
    description: '密码策略、登录安全等配置',
    icon: 'Shield',
    sortOrder: 2,
  },
  {
    code: 'notification',
    name: '通知配置',
    description: '邮件、短信等通知相关配置',
    icon: 'Bell',
    sortOrder: 3,
  },
  {
    code: 'approval',
    name: '审批流程',
    description: '审批流程相关配置',
    icon: 'FileCheck',
    sortOrder: 4,
  },
  {
    code: 'attendance',
    name: '考勤管理',
    description: '考勤时间、规则等配置',
    icon: 'Clock',
    sortOrder: 5,
  },
  {
    code: 'task',
    name: '任务管理',
    description: '任务默认设置',
    icon: 'CheckSquare',
    sortOrder: 6,
  },
  {
    code: 'equipment',
    name: '设备管理',
    description: '设备保养、库存预警等配置',
    icon: 'Wrench',
    sortOrder: 7,
  },
  {
    code: 'document',
    name: '文档管理',
    description: '文件上传、存储等配置',
    icon: 'FileText',
    sortOrder: 8,
  },
];

/**
 * 确保配置分类存在
 */
async function ensureCategories(): Promise<Map<string, string>> {
  const categoryMap = new Map<string, string>();

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.configCategory.findUnique({
      where: { code: cat.code },
    });

    if (existing) {
      categoryMap.set(cat.code, existing.id);
    } else {
      const created = await prisma.configCategory.create({
        data: cat,
      });
      categoryMap.set(cat.code, created.id);
    }
  }

  return categoryMap;
}

/**
 * 迁移邮件设置
 */
async function migrateEmailSettings(
  categoryMap: Map<string, string>,
  dryRun: boolean
): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const result = { migrated: 0, skipped: 0, errors: [] as string[] };

  try {
    const emailSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    if (!emailSettings) {
      console.log('  未找到 EmailSettings 数据，跳过');
      return result;
    }

    const categoryId = categoryMap.get('notification');
    if (!categoryId) {
      result.errors.push('未找到 notification 分类');
      return result;
    }

    // 定义需要迁移的配置项
    const configsToMigrate = [
      {
        key: 'email.enabled',
        value: String(emailSettings.enabled),
        valueType: ConfigValueType.BOOLEAN,
        label: '启用邮件通知',
        description: '是否启用系统邮件通知功能',
      },
      {
        key: 'email.smtp.host',
        value: emailSettings.smtpHost,
        valueType: ConfigValueType.STRING,
        label: 'SMTP服务器',
        description: '邮件服务器地址',
        placeholder: 'smtp.example.com',
      },
      {
        key: 'email.smtp.port',
        value: String(emailSettings.smtpPort),
        valueType: ConfigValueType.NUMBER,
        label: 'SMTP端口',
        description: '邮件服务器端口',
      },
      {
        key: 'email.smtp.user',
        value: emailSettings.smtpUser,
        valueType: ConfigValueType.STRING,
        label: '发件人邮箱',
        description: '系统发件邮箱地址',
        placeholder: 'noreply@company.com',
      },
      {
        key: 'email.smtp.password',
        value: emailSettings.smtpPassword,
        valueType: ConfigValueType.STRING,
        label: '邮箱密码/授权码',
        description: '邮箱密码或SMTP授权码',
        isSecret: true,
      },
      {
        key: 'email.reminder.task',
        value: String(emailSettings.taskReminder),
        valueType: ConfigValueType.BOOLEAN,
        label: '任务提醒',
        description: '是否发送任务提醒邮件',
      },
      {
        key: 'email.reminder.meeting',
        value: String(emailSettings.meetingReminder),
        valueType: ConfigValueType.BOOLEAN,
        label: '会议提醒',
        description: '是否发送会议提醒邮件',
      },
      {
        key: 'email.reminder.approval',
        value: String(emailSettings.approvalReminder),
        valueType: ConfigValueType.BOOLEAN,
        label: '审批提醒',
        description: '是否发送审批提醒邮件',
      },
    ];

    for (const config of configsToMigrate) {
      try {
        const existing = await prisma.systemConfig.findFirst({
          where: {
            categoryId,
            key: config.key,
          },
        });

        if (existing) {
          if (!dryRun) {
            await prisma.systemConfig.update({
              where: { id: existing.id },
              data: { value: config.value },
            });
          }
          result.migrated++;
        } else {
          if (!dryRun) {
            await prisma.systemConfig.create({
              data: {
                categoryId,
                key: config.key,
                value: config.value,
                valueType: config.valueType,
                label: config.label,
                description: config.description,
                placeholder: config.placeholder,
                isSecret: config.isSecret ?? false,
                sortOrder: 0,
              },
            });
          }
          result.migrated++;
        }
      } catch (error) {
        result.errors.push(`迁移 ${config.key} 失败: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`读取 EmailSettings 失败: ${error}`);
  }

  return result;
}

/**
 * 迁移系统设置
 */
async function migrateSystemSettings(
  categoryMap: Map<string, string>,
  dryRun: boolean
): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const result = { migrated: 0, skipped: 0, errors: [] as string[] };

  try {
    const systemSettings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });

    if (!systemSettings) {
      console.log('  未找到 SystemSettings 数据，跳过');
      return result;
    }

    const categoryId = categoryMap.get('system');
    if (!categoryId) {
      result.errors.push('未找到 system 分类');
      return result;
    }

    // 定义需要迁移的配置项
    const configsToMigrate = [
      {
        key: 'system.autoBackupEnabled',
        value: String(systemSettings.autoBackupEnabled),
        valueType: ConfigValueType.BOOLEAN,
        label: '启用自动备份',
        description: '是否启用系统自动备份功能',
      },
    ];

    for (const config of configsToMigrate) {
      try {
        const existing = await prisma.systemConfig.findFirst({
          where: {
            categoryId,
            key: config.key,
          },
        });

        if (existing) {
          if (!dryRun) {
            await prisma.systemConfig.update({
              where: { id: existing.id },
              data: { value: config.value },
            });
          }
          result.migrated++;
        } else {
          if (!dryRun) {
            await prisma.systemConfig.create({
              data: {
                categoryId,
                key: config.key,
                value: config.value,
                valueType: config.valueType,
                label: config.label,
                description: config.description,
                sortOrder: 0,
              },
            });
          }
          result.migrated++;
        }
      } catch (error) {
        result.errors.push(`迁移 ${config.key} 失败: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`读取 SystemSettings 失败: ${error}`);
  }

  return result;
}

/**
 * 执行迁移
 */
async function runMigration(dryRun: boolean = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    categoriesCreated: 0,
    configsMigrated: 0,
    configsSkipped: 0,
    errors: [],
  };

  console.log('='.repeat(60));
  console.log('系统设置数据迁移');
  console.log('='.repeat(60));
  console.log(`模式: ${dryRun ? '预览模式 (dry-run)' : '实际执行'}`);
  console.log();

  try {
    // 步骤1: 确保分类存在
    console.log('步骤 1/3: 创建配置分类...');
    const categoryMap = await ensureCategories();
    result.categoriesCreated = DEFAULT_CATEGORIES.length;
    console.log(`  已确保 ${categoryMap.size} 个分类存在`);
    console.log();

    // 步骤2: 迁移邮件设置
    console.log('步骤 2/3: 迁移邮件设置...');
    const emailResult = await migrateEmailSettings(categoryMap, dryRun);
    result.configsMigrated += emailResult.migrated;
    result.configsSkipped += emailResult.skipped;
    result.errors.push(...emailResult.errors);
    console.log(`  迁移完成: ${emailResult.migrated} 个配置项`);
    if (emailResult.errors.length > 0) {
      console.log(`  错误: ${emailResult.errors.length} 个`);
    }
    console.log();

    // 步骤3: 迁移系统设置
    console.log('步骤 3/3: 迁移系统设置...');
    const systemResult = await migrateSystemSettings(categoryMap, dryRun);
    result.configsMigrated += systemResult.migrated;
    result.configsSkipped += systemResult.skipped;
    result.errors.push(...systemResult.errors);
    console.log(`  迁移完成: ${systemResult.migrated} 个配置项`);
    if (systemResult.errors.length > 0) {
      console.log(`  错误: ${systemResult.errors.length} 个`);
    }
    console.log();

    // 输出结果
    console.log('='.repeat(60));
    console.log('迁移结果');
    console.log('='.repeat(60));
    console.log(`配置分类: ${result.categoriesCreated} 个`);
    console.log(`配置项迁移: ${result.configsMigrated} 个`);
    console.log(`配置项跳过: ${result.configsSkipped} 个`);
    console.log(`错误数: ${result.errors.length} 个`);

    if (result.errors.length > 0) {
      console.log();
      console.log('错误详情:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      result.success = false;
    }

    console.log();
    console.log(dryRun ? '预览完成，未写入数据库' : '迁移完成！');
    console.log('='.repeat(60));
  } catch (error) {
    result.success = false;
    result.errors.push(`迁移过程发生错误: ${error}`);
    console.error('迁移失败:', error);
  }

  return result;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const result = await runMigration(dryRun);

  // 断开数据库连接
  await prisma.$disconnect();

  // 根据结果设置退出码
  process.exit(result.success ? 0 : 1);
}

// 执行主函数
main().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});
