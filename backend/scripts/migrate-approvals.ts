#!/usr/bin/env ts-node
/**
 * 审批数据迁移脚本
 * 将旧的四级审批表数据迁移到新的统一 Approval 表
 *
 * 运行方式: npx ts-node scripts/migrate-approvals.ts
 */

import prisma from '../src/lib/prisma';

type Metadata = {
  approvedAt?: string;
  selectedManagerIds?: string[];
  skipManager?: boolean;
};

async function migrateApprovals(): Promise<void> {
  console.log('开始迁移审批数据...');

  // 迁移 FactoryApproval (level=1)
  console.log('迁移厂长审批数据...');
  const factoryApprovals = await prisma.factoryApproval.findMany();
  for (const approval of factoryApprovals) {
    const metadata: Metadata = {};
    if (approval.approvedAt) {
      metadata.approvedAt = approval.approvedAt.toISOString();
    }

    await prisma.approval.create({
      data: {
        applicationId: approval.applicationId,
        approverId: approval.approverId,
        level: 1, // Factory
        action: approval.action,
        comment: approval.comment,
        metadata: metadata,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
    });
  }
  console.log(`  已迁移 ${factoryApprovals.length} 条厂长审批记录`);

  // 迁移 DirectorApproval (level=2)
  console.log('迁移总监审批数据...');
  const directorApprovals = await prisma.directorApproval.findMany();
  for (const approval of directorApprovals) {
    const metadata: Metadata = {};
    if (approval.approvedAt) {
      metadata.approvedAt = approval.approvedAt.toISOString();
    }
    if (approval.selectedManagerIds && approval.selectedManagerIds.length > 0) {
      metadata.selectedManagerIds = approval.selectedManagerIds;
    }
    if (approval.skipManager) {
      metadata.skipManager = approval.skipManager;
    }

    await prisma.approval.create({
      data: {
        applicationId: approval.applicationId,
        approverId: approval.approverId,
        level: 2, // Director
        action: approval.action,
        comment: approval.comment,
        metadata: metadata,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
    });
  }
  console.log(`  已迁移 ${directorApprovals.length} 条总监审批记录`);

  // 迁移 ManagerApproval (level=3)
  console.log('迁移经理审批数据...');
  const managerApprovals = await prisma.managerApproval.findMany();
  for (const approval of managerApprovals) {
    const metadata: Metadata = {};
    if (approval.approvedAt) {
      metadata.approvedAt = approval.approvedAt.toISOString();
    }

    await prisma.approval.create({
      data: {
        applicationId: approval.applicationId,
        approverId: approval.approverId,
        level: 3, // Manager
        action: approval.action,
        comment: approval.comment,
        metadata: metadata,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
    });
  }
  console.log(`  已迁移 ${managerApprovals.length} 条经理审批记录`);

  // 迁移 CeoApproval (level=4)
  console.log('迁移CEO审批数据...');
  const ceoApprovals = await prisma.ceoApproval.findMany();
  for (const approval of ceoApprovals) {
    const metadata: Metadata = {};
    if (approval.approvedAt) {
      metadata.approvedAt = approval.approvedAt.toISOString();
    }

    await prisma.approval.create({
      data: {
        applicationId: approval.applicationId,
        approverId: approval.approverId,
        level: 4, // CEO
        action: approval.action,
        comment: approval.comment,
        metadata: metadata,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
    });
  }
  console.log(`  已迁移 ${ceoApprovals.length} 条CEO审批记录`);

  const total = factoryApprovals.length + directorApprovals.length +
                managerApprovals.length + ceoApprovals.length;
  console.log(`\n迁移完成！共迁移 ${total} 条审批记录`);
}

async function verifyMigration(): Promise<void> {
  console.log('\n验证迁移结果...');

  const newCount = await prisma.approval.count();
  const factoryCount = await prisma.factoryApproval.count();
  const directorCount = await prisma.directorApproval.count();
  const managerCount = await prisma.managerApproval.count();
  const ceoCount = await prisma.ceoApproval.count();
  const oldTotal = factoryCount + directorCount + managerCount + ceoCount;

  console.log(`  旧表记录总数: ${oldTotal}`);
  console.log(`  新表记录总数: ${newCount}`);

  if (newCount === oldTotal) {
    console.log('  验证通过：记录数匹配');
  } else {
    console.log('  警告：记录数不匹配，请检查！');
  }

  // 按级别统计
  const levelStats = await prisma.approval.groupBy({
    by: ['level'],
    _count: { level: true },
  });
  console.log('\n按级别统计:');
  for (const stat of levelStats) {
    const levelName = ['', '厂长', '总监', '经理', 'CEO'][stat.level];
    console.log(`  ${levelName} (level=${stat.level}): ${stat._count.level} 条`);
  }
}

async function main(): Promise<void> {
  try {
    await migrateApprovals();
    await verifyMigration();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
