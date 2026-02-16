import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../lib/logger';

// 邮件传输器配置
const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure,
  auth: {
    user: config.email.smtp.auth.user,
    pass: config.email.smtp.auth.pass,
  },
});

// 服务器配置
const SERVER_URL = config.server?.url || 'http://localhost:3001';

// 邮件模板接口
interface EmailTemplateData {
  title: string;
  applicant: string;
  applicationNo: string;
  department: string;
  date: string;
  content: string;
  priority: string;
  status: string;
  actionText: string;
  actionUrl: string;
  additionalInfo?: string;
}

/**
 * 生成邮件HTML模板
 */
export function generateEmailTemplate(data: EmailTemplateData): string {
  const priorityColor = {
    'URGENT': '#dc2626',
    'HIGH': '#ea580c',
    'NORMAL': '#2563eb',
    'LOW': '#6b7280',
  }[data.priority] || '#2563eb';

  const priorityText = {
    'URGENT': '紧急',
    'HIGH': '高',
    'NORMAL': '普通',
    'LOW': '低',
  }[data.priority] || '普通';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f3f4f6; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .priority { color: ${priorityColor}; font-weight: bold; }
    .status { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
    .button { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .content-box { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; color: #111827;">${data.title}</h2>
    </div>
    <div class="content">
      <div class="info-row">
        <span class="label">申请编号：</span>${data.applicationNo}
      </div>
      <div class="info-row">
        <span class="label">申请人：</span>${data.applicant}
      </div>
      <div class="info-row">
        <span class="label">部门：</span>${data.department}
      </div>
      <div class="info-row">
        <span class="label">申请日期：</span>${data.date}
      </div>
      <div class="info-row">
        <span class="label">优先级：</span><span class="priority">${priorityText}</span>
      </div>
      <div class="info-row">
        <span class="label">当前状态：</span><span class="status">${data.status}</span>
      </div>
      <div class="content-box">
        <div class="label">申请内容：</div>
        <div style="margin-top: 8px; white-space: pre-wrap;">${data.content}</div>
      </div>
      ${data.additionalInfo ? `<div style="color: #dc2626; margin: 15px 0;">${data.additionalInfo}</div>` : ''}
      <a href="${data.actionUrl}" class="button">${data.actionText}</a>
    </div>
    <div class="footer">
      此邮件由OA系统自动发送，请勿直接回复。
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 发送邮件通知
 * @param recipients 收件人邮箱（单个或多个）
 * @param subject 邮件主题
 * @param htmlContent 邮件HTML内容
 * @param applicationCode 申请编号（用于日志）
 * @returns 是否发送成功
 */
export async function sendEmailNotification(
  recipients: string | string[],
  subject: string,
  htmlContent: string,
  applicationCode: string | null = null
): Promise<boolean> {
  // 如果没有收件人，直接返回失败
  if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || recipients === '') {
    const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
    logger.info(`【${new Date().toLocaleString('zh-CN')}】${logPrefix}邮件发送失败: 没有有效的收件人`);
    return false;
  }

  let retryCount = 0;
  let hasLoggedFailure = false;

  const sendMail = async (): Promise<boolean> => {
    try {
      const to = Array.isArray(recipients) ? recipients.join(',') : recipients;

      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
      logger.info(`【${new Date().toLocaleString('zh-CN')}】${logPrefix}邮件发送成功: ${info.messageId}`);
      return true;
    } catch (error) {
      if (!hasLoggedFailure) {
        const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
        logger.error(`【${new Date().toLocaleString('zh-CN')}】${logPrefix}邮件发送失败，开始无限重试中...`, { error: (error as Error).message });
        hasLoggedFailure = true;
      }

      retryCount++;
      // 无限重试直到成功 - 符合业务要求
      const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
      logger.info(`【${new Date().toLocaleString('zh-CN')}】${logPrefix}第 ${retryCount} 次重试，${config.email.retryDelay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, config.email.retryDelay));
      return await sendMail();
    }
  };

  return await sendMail();
}

/**
 * 发送审批通知邮件
 */
export async function sendApprovalEmail(
  recipientEmails: string | string[],
  application: {
    applicationNo: string;
    applicantName: string;
    submitterDepartment: string;
    createdAt: Date;
    title: string;
    priority: string;
    status: string;
  },
  actionType: 'submit' | 'approve' | 'reject' | 'withdraw'
): Promise<boolean> {
  const titles: Record<string, string> = {
    submit: '新申请待审批',
    approve: '申请已审批通过',
    reject: '申请已被拒绝',
    withdraw: '申请被撤回重审',
  };

  const actionTexts: Record<string, string> = {
    submit: '查看申请',
    approve: '查看详情',
    reject: '查看详情',
    withdraw: '查看申请',
  };

  const additionalInfo: Record<string, string | undefined> = {
    submit: undefined,
    approve: '您的申请已通过审批。',
    reject: '您的申请未通过审批，请联系审批人了解详情。',
    withdraw: '审批人撤回了此前的审批决定，申请将重新进入审批环节。',
  };

  const emailContent = generateEmailTemplate({
    title: titles[actionType],
    applicant: application.applicantName,
    applicationNo: application.applicationNo,
    department: application.submitterDepartment,
    date: application.createdAt.toLocaleDateString('zh-CN'),
    content: application.title,
    priority: application.priority,
    status: application.status,
    actionText: actionTexts[actionType],
    actionUrl: `${SERVER_URL}/applications`,
    additionalInfo: additionalInfo[actionType],
  });

  return sendEmailNotification(
    recipientEmails,
    `${titles[actionType]} - ${application.applicationNo}`,
    emailContent,
    application.applicationNo
  );
}
