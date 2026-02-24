import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import ExcelJS from 'exceljs';
import * as logger from '../lib/logger';

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

// 统一的响应辅助函数
function errorResponse(res: Response, code: string, message: string, status = 500): void {
  res.status(status).json({ success: false, error: { code, message } });
}

// 创建Excel工作簿并设置表头
interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

function createExcelWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: ColumnDef[]
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns;

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

  return worksheet;
}

// 设置Excel导出响应头
function setExcelResponseHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`);
}

/**
 * 导出申请到Excel
 * GET /api/export/applications
 */
export async function exportApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const { timeRange, startDate, endDate } = req.query;
    const where = buildDateFilter(timeRange as string | undefined, startDate as string | undefined, endDate as string | undefined);

    // 非管理员只能导出自己的申请
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 查询申请数据
    const applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        applicant: { select: { name: true, department: true, email: true } },
        _count: { select: { attachments: true } },
      },
    });

    // 创建Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = createExcelWorksheet(workbook, '申请记录', [
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
    ]);

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

    setExcelResponseHeaders(res, 'applications');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('导出申请失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '导出申请失败');
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
      errorResponse(res, 'FORBIDDEN', '权限不足', 403);
      return;
    }

    // 查询用户数据
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        username: true, name: true, employeeId: true, email: true,
        department: { select: { name: true } }, role: true, isActive: true, createdAt: true,
      },
    });

    // 创建Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = createExcelWorksheet(workbook, '用户列表', [
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '工号', key: 'employeeId', width: 12 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '部门', key: 'department', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建日期', key: 'createdAt', width: 15 },
    ]);

    // 添加数据
    users.forEach((u) => {
      worksheet.addRow({
        username: u.username, name: u.name, employeeId: u.employeeId,
        email: u.email, department: u.department?.name || '',
        role: roleMap[u.role] || u.role,
        status: u.isActive ? '启用' : '禁用',
        createdAt: u.createdAt.toLocaleDateString('zh-CN'),
      });
    });

    setExcelResponseHeaders(res, 'users');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('导出用户失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '导出用户失败');
  }
}

// 构建日期筛选条件
function buildDateFilter(
  timeRange: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (timeRange && timeRange !== 'all') {
    const start = getStartDateFromRange(timeRange);
    where.createdAt = { gte: start };
  }

  return where;
}

// 根据时间范围获取开始日期
function getStartDateFromRange(timeRange: string): Date {
  const now = new Date();

  switch (timeRange) {
    case 'week': {
      const day = now.getDay() || 7;
      const start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0);
  }
}

/**
 * 导出新产品开发企划表到Excel
 * GET /api/export/product-development/:id
 */
export async function exportProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        projectReviewer: { select: { name: true, signature: true } },
        projectProposer: { select: { name: true, signature: true } },
      }
    });

    if (!application || application.type !== 'PRODUCT_DEVELOPMENT') {
      errorResponse(res, 'NOT_FOUND', '申请不存在或类型不匹配', 404);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('新产品开发企划表');

    // 设置列宽
    worksheet.columns = [
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 20 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // 标题
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = '新产品开发企划表';
    worksheet.getCell('A1').font = { size: 18, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // 项目信息
    worksheet.addRow(['']);
    worksheet.addRow(['项目编号', application.projectNo, '项目名称', application.projectName || '', '', '', '', '']);
    worksheet.mergeCells('D3:H3');
    worksheet.addRow(['客户名称', application.customerName || '', '提案日期', application.createdAt.toLocaleDateString('zh-CN'), '', '', '', '']);
    worksheet.mergeCells('B4:D4');
    worksheet.addRow(['']);

    // 开发源由
    worksheet.addRow(['开发源由']);
    worksheet.getCell('A6').font = { bold: true };
    const sources = [
      '因市场需求趋势而提出开发',
      '因本公司产品策略而主动提出开发',
      '因客户需求而提出开发',
      '因本公司上级决策而提出开发',
      '因客户对现有产品进行改善开发',
      '因本公司内部产品改善建议而提出开发',
    ];
    let currentRow = 7;
    sources.forEach((source) => {
      const isSelected = application.projectSources?.includes(source);
      worksheet.addRow([isSelected ? '☑' : '☐', source]);
      worksheet.mergeCells(`B${currentRow}:H${currentRow}`);
      currentRow++;
    });

    // 项目内容
    worksheet.addRow(['']);
    currentRow++;
    worksheet.addRow(['项目内容']);
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    const content = application.projectContent as Record<string, string> | null;
    const contentLabels = [
      { key: 'nature', label: '新产品性质介绍（材质、规格、包装方式等）' },
      { key: 'successProbability', label: '新产品开发成功可能性预估（客户接受之可能性）' },
      { key: 'competition', label: '是否有同类型的新产品竞争' },
      { key: 'developmentCost', label: '新产品开发费用的预估' },
      { key: 'productionCost', label: '新产品开发成本的预估' },
      { key: 'compliance', label: '是否符合法令规定要求（NIOSH/CE/CNS/JIS/LL等）' },
      { key: 'profitForecast', label: '新产品开发成功量产后本公司的获利情况预估' },
    ];

    contentLabels.forEach(({ key, label }) => {
      worksheet.addRow([label]);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;

      const value = content?.[key] || '';
      worksheet.addRow([value]);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      worksheet.getRow(currentRow).height = 60;
      worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
      currentRow++;
    });

    // 签名区域
    worksheet.addRow(['']);
    currentRow++;
    const signRow = currentRow;
    worksheet.addRow(['项目审核人', '', '项目申请人', '']);
    worksheet.mergeCells(`A${signRow}:B${signRow}`);
    worksheet.mergeCells(`C${signRow}:D${signRow}`);
    worksheet.getCell(`A${signRow}`).font = { bold: true };
    worksheet.getCell(`C${signRow}`).font = { bold: true };
    currentRow++;

    worksheet.addRow([
      application.projectReviewer?.name || '',
      '',
      application.projectProposer?.name || '',
      ''
    ]);
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${application.projectNo || 'export'}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('导出新产品开发企划表失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '导出失败');
  }
}

/**
 * 导出可行性评估表到Excel
 * GET /api/export/feasibility-study/:id
 */
export async function exportFeasibilityStudy(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        projectReviewer: { select: { name: true, signature: true } },
        projectProposer: { select: { name: true, signature: true } },
      }
    });

    if (!application || application.type !== 'FEASIBILITY_STUDY') {
      errorResponse(res, 'NOT_FOUND', '申请不存在或类型不匹配', 404);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('可行性评估表');

    // 设置列宽
    worksheet.columns = [
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 20 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // 标题
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = '可行性评估表';
    worksheet.getCell('A1').font = { size: 18, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // 项目信息
    worksheet.addRow(['']);
    worksheet.addRow(['项目编号', application.projectNo, '项目名称', application.projectName || '', '', '', '', '']);
    worksheet.mergeCells('D3:H3');
    worksheet.addRow(['客户名称', application.customerName || '', '提案日期', application.createdAt.toLocaleDateString('zh-CN'), '', '', '', '']);
    worksheet.mergeCells('B4:D4');
    worksheet.addRow(['']);

    // 评估项目
    worksheet.addRow(['评估项目']);
    worksheet.getCell('A6').font = { bold: true };

    const evaluationItems = application.evaluationItems as Record<string, { score: number; comment: string }> | null;
    const evaluationLabels = [
      { key: 'market', label: '市场评估' },
      { key: 'technology', label: '技术评估' },
      { key: 'cost', label: '成本评估' },
      { key: 'risk', label: '风险评估' },
      { key: 'schedule', label: '进度评估' },
    ];

    let currentRow = 7;
    worksheet.addRow(['评估项', '评分', '说明']);
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    worksheet.getCell(`C${currentRow}`).font = { bold: true };
    currentRow++;

    evaluationLabels.forEach(({ key, label }) => {
      const item = evaluationItems?.[key];
      worksheet.addRow([label, item?.score?.toString() || '', item?.comment || '']);
      worksheet.mergeCells(`C${currentRow}:H${currentRow}`);
      currentRow++;
    });

    // 评估结果
    worksheet.addRow(['']);
    currentRow++;
    worksheet.addRow(['评估结果', application.evaluationResult || '']);
    worksheet.mergeCells(`B${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    // 签名区域
    worksheet.addRow(['']);
    currentRow++;
    const signRow = currentRow;
    worksheet.addRow(['项目审核人', '', '项目申请人', '']);
    worksheet.mergeCells(`A${signRow}:B${signRow}`);
    worksheet.mergeCells(`C${signRow}:D${signRow}`);
    worksheet.getCell(`A${signRow}`).font = { bold: true };
    worksheet.getCell(`C${signRow}`).font = { bold: true };
    currentRow++;

    worksheet.addRow([
      application.projectReviewer?.name || '',
      '',
      application.projectProposer?.name || '',
      ''
    ]);
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${application.projectNo || 'feasibility'}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('导出可行性评估表失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '导出失败');
  }
}
