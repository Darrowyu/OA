import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// 归档配置
const ARCHIVE_CONFIG = {
  baseDir: path.join(process.cwd(), 'archive'), // 归档根目录
};

// 确保归档目录存在
function ensureArchiveDir(): void {
  if (!fs.existsSync(ARCHIVE_CONFIG.baseDir)) {
    fs.mkdirSync(ARCHIVE_CONFIG.baseDir, { recursive: true });
  }
}

// 生成归档路径
function generateArchivePath(applicationNo: string): { dateDir: string; appDir: string; fullPath: string } {
  const now = new Date();
  const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const appDir = applicationNo;
  const fullPath = path.join(ARCHIVE_CONFIG.baseDir, dateDir, appDir);
  return { dateDir, appDir, fullPath };
}

// 归档结果接口
export interface ArchiveResult {
  success: boolean;
  archiveId?: string;
  archivePath?: string;
  error?: string;
}

// 获取申请完整数据快照
async function getApplicationSnapshot(applicationId: string): Promise<any> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true, department: true, employeeId: true, role: true },
      },
      attachments: {
        select: { id: true, filename: true, storedName: true, path: true, size: true, mimeType: true, createdAt: true },
      },
      factoryApprovals: {
        include: {
          approver: { select: { id: true, name: true, employeeId: true, role: true } },
        },
      },
      directorApprovals: {
        include: {
          approver: { select: { id: true, name: true, employeeId: true, role: true } },
        },
      },
      managerApprovals: {
        include: {
          approver: { select: { id: true, name: true, employeeId: true, role: true } },
        },
      },
      ceoApprovals: {
        include: {
          approver: { select: { id: true, name: true, employeeId: true, role: true } },
        },
      },
    },
  });

  if (!application) {
    throw new Error('申请不存在');
  }

  // 转换为纯JSON对象，去除Prisma内部字段
  return JSON.parse(JSON.stringify({
    ...application,
    archivedAt: new Date().toISOString(),
  }));
}

// 复制文件
function copyFileSync(source: string, target: string): boolean {
  try {
    if (!fs.existsSync(source)) {
      console.error(`源文件不存在: ${source}`);
      return false;
    }
    fs.copyFileSync(source, target);
    return true;
  } catch (error) {
    console.error(`复制文件失败: ${source} -> ${target}`, error);
    return false;
  }
}

// 归档申请
export async function archiveApplication(applicationId: string, tx?: Prisma.TransactionClient): Promise<ArchiveResult> {
  try {
    ensureArchiveDir();

    // 获取申请信息
    const prismaClient = tx || prisma;
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        attachments: true,
        archiveRecord: true,
      },
    });

    if (!application) {
      return { success: false, error: '申请不存在' };
    }

    // 检查是否已归档
    if (application.archiveRecord) {
      return { success: false, error: '申请已归档' };
    }

    // 生成归档路径
    const { dateDir, fullPath } = generateArchivePath(application.applicationNo);
    const attachmentsDir = path.join(fullPath, 'attachments');

    // 创建归档目录
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    // 获取完整数据快照
    const dataSnapshot = await getApplicationSnapshot(applicationId);

    // 保存数据快照到JSON文件
    const snapshotPath = path.join(fullPath, 'application.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(dataSnapshot, null, 2), 'utf-8');

    // 复制附件到归档目录
    const archivedAttachments: string[] = [];
    for (const attachment of application.attachments) {
      const sourcePath = attachment.path;
      const targetPath = path.join(attachmentsDir, attachment.filename);

      if (copyFileSync(sourcePath, targetPath)) {
        archivedAttachments.push(attachment.filename);
      }
    }

    // 创建归档记录
    const archiveRecord = await prismaClient.archiveRecord.create({
      data: {
        applicationId: applicationId,
        applicationNo: application.applicationNo,
        archivePath: path.join(dateDir, application.applicationNo),
        dataSnapshot: dataSnapshot as Prisma.InputJsonValue,
      },
    });

    console.log(`申请 ${application.applicationNo} 归档成功，路径: ${fullPath}`);

    return {
      success: true,
      archiveId: archiveRecord.id,
      archivePath: fullPath,
    };
  } catch (error) {
    console.error('归档申请失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '归档失败',
    };
  }
}

// 获取归档记录
export async function getArchiveRecord(applicationId: string) {
  return await prisma.archiveRecord.findUnique({
    where: { applicationId },
  });
}

// 获取归档文件路径
export function getArchiveFilePath(archivePath: string, filename: string): string {
  return path.join(ARCHIVE_CONFIG.baseDir, archivePath, 'attachments', filename);
}

// 检查归档是否存在
export function checkArchiveExists(archivePath: string): boolean {
  const fullPath = path.join(ARCHIVE_CONFIG.baseDir, archivePath);
  return fs.existsSync(fullPath);
}
