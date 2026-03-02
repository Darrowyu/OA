import { prisma } from '../src/lib/prisma';
import * as logger from '../src/lib/logger';

const DEFAULT_QUICK_LINKS = [
  { name: '报销申请', path: '/approval/new?type=reimbursement', icon: 'Receipt', sortOrder: 0 },
  { name: '请假申请', path: '/approval/new?type=leave', icon: 'Calendar', sortOrder: 1 },
];

const BATCH_SIZE = 1000;

/**
 * 为现有用户初始化默认快捷入口
 * 运行: npx ts-node scripts/init-quick-links.ts
 */
async function initQuickLinks(): Promise<{ created: number; skipped: number }> {
  let createdCount = 0;
  let skippedCount = 0;
  let processedCount = 0;

  try {
    // 获取已有快捷入口的用户ID
    const existingLinks = await prisma.userQuickLink.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const usersWithLinks = new Set(existingLinks.map((l) => l.userId));

    // 分页处理用户
    while (true) {
      const users = await prisma.user.findMany({
        select: { id: true, username: true },
        take: BATCH_SIZE,
        skip: processedCount,
      });

      if (users.length === 0) break;

      for (const user of users) {
        if (usersWithLinks.has(user.id)) {
          logger.debug(`跳过 ${user.username} - 已有快捷入口`);
          skippedCount++;
          continue;
        }

        await prisma.userQuickLink.createMany({
          data: DEFAULT_QUICK_LINKS.map((link) => ({
            ...link,
            userId: user.id,
          })),
        });

        logger.info(`已为 ${user.username} 创建快捷入口`);
        createdCount++;
      }

      processedCount += users.length;
      logger.info(`已处理 ${processedCount} 个用户`);
    }

    logger.info('初始化完成', { created: createdCount, skipped: skippedCount });
    return { created: createdCount, skipped: skippedCount };
  } catch (error) {
    logger.error('初始化快捷入口失败', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 仅在直接运行此脚本时执行
if (require.main === module) {
  initQuickLinks()
    .then((result) => {
      console.log(`\n完成: 创建了 ${result.created} 个用户，跳过了 ${result.skipped} 个用户`);
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { initQuickLinks };
