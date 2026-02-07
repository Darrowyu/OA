import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// 状态映射
const statusMap: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_FACTORY: '待厂长审核',
  PENDING_DIRECTOR: '待总监审批',
  PENDING_MANAGER: '待经理审批',
  PENDING_CEO: '待CEO审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  ARCHIVED: '已归档',
};

// 优先级映射
const priorityMap: Record<string, string> = {
  LOW: '低',
  NORMAL: '普通',
  HIGH: '高',
  URGENT: '紧急',
};

// 角色映射
const roleMap: Record<string, string> = {
  USER: '普通用户',
  FACTORY_MANAGER: '厂长',
  DIRECTOR: '总监',
  MANAGER: '经理',
  CEO: 'CEO',
  ADMIN: '管理员',
  READONLY: '只读用户',
};

/**
 * 导出申请到Excel
 * GET /api/export/applications
 */
export async function exportApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }

    const { timeRange, startDate, endDate } = req.query;

    // 构建查询条件
    const where: any = {};

    // 非管理员只能导出自己的申请
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 日期筛选
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: start,
        lte: end,
      };
    } else if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDateFilter: Date;

      if (timeRange === 'week') {
        const day = now.getDay() || 7;
        startDateFilter = new Date(now);
        startDateFilter.setDate(now.getDate() - day + 1);
        startDateFilter.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDateFilter = new Date(now.getFullYear(), 0, 1);
      } else {
        startDateFilter = new Date(0);
      }

      where.createdAt = {
        gte: startDateFilter,
      };
    }

    // 查询申请数据
    const applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        applicant: {
          select: { name: true, department: true, email: true },
        },
        _count: {
          select: { attachments: true },
        },
      },
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('申请记录');

    // 设置列
    worksheet.columns = [
      { header: '申请编号', key: 'applicationNo', width: 18 },
      { header: '标题', key: 'title', width: 30 },
      { header: '申请人', key: 'applicant', width: 12 },
      { header: '部门', key: 'department', width: 15 },
      { header: '申请日期', key: 'date', width: 15 },
      { header: '紧急程度', key: 'priority', width: 10 },
      { header: '申请金额', key: 'amount', width: 12 },
      { header: '币种', key: 'currency', width: 8 },
      { header: '状态', key: 'status', width: 12 },
      { header: '附件数', key: 'attachments', width: 10 },
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // 添加数据
    applications.forEach((app) => {
      worksheet.addRow({
        applicationNo: app.applicationNo,
        title: app.title,
        applicant: app.applicantName,
        department: app.applicantDept,
        date: app.createdAt.toLocaleDateString('zh-CN'),
        priority: priorityMap[app.priority] || app.priority,
        amount: app.amount ? Number(app.amount).toFixed(2) : '0.00',
        currency: 'CNY',
        status: statusMap[app.status] || app.status,
        attachments: app._count.attachments,
      });
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="applications_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出申请失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '导出申请失败' } });
  }
}

/**
 * 导出用户到Excel
 * GET /api/export/users
 */
export async function exportUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
      return;
    }

    // 查询用户数据
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        username: true,
        name: true,
        employeeId: true,
        email: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户列表');

    // 设置列
    worksheet.columns = [
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '工号', key: 'employeeId', width: 12 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '部门', key: 'department', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建日期', key: 'createdAt', width: 15 },
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // 添加数据
    users.forEach((user) => {
      worksheet.addRow({
        username: user.username,
        name: user.name,
        employeeId: user.employeeId,
        email: user.email,
        department: user.department,
        role: roleMap[user.role] || user.role,
        status: user.isActive ? '启用' : '禁用',
        createdAt: user.createdAt.toLocaleDateString('zh-CN'),
      });
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出用户失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '导出用户失败' } });
  }
}
