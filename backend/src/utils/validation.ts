/**
 * 附件命名规范验证工具
 * 验证规则：
 * 1. 日期格式：20250101 或 2025-01-01 或 2025/01/01
 * 2. 中文字符：除日期外至少5个
 * 3. 文件格式：仅PDF
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FilenameValidationResult {
  isValid: boolean;
  filename: string;
  errors: string[];
}

// 日期格式正则表达式
const DATE_PATTERNS = [
  { pattern: /\d{8}/, format: '20250101', example: '20250101' },
  { pattern: /\d{4}-\d{2}-\d{2}/, format: '2025-01-01', example: '2025-01-01' },
  { pattern: /\d{4}\/\d{2}\/\d{2}/, format: '2025/01/01', example: '2025/01/01' },
];

/**
 * 检查文件名是否包含有效日期
 */
function hasValidDate(filename: string): boolean {
  return DATE_PATTERNS.some(({ pattern }) => pattern.test(filename));
}

/**
 * 获取日期格式说明
 */
function getDateFormatHint(): string {
  return DATE_PATTERNS.map(d => d.example).join(' 或 ');
}

/**
 * 计算中文字符数量（不包括日期部分）
 */
function countChineseChars(filename: string): number {
  // 移除日期部分
  let nameWithoutDate = filename;
  for (const { pattern } of DATE_PATTERNS) {
    nameWithoutDate = nameWithoutDate.replace(pattern, '');
  }
  // 移除扩展名
  nameWithoutDate = nameWithoutDate.replace(/\.[^.]+$/, '');
  // 匹配中文字符
  const chineseMatches = nameWithoutDate.match(/[\u4e00-\u9fa5]/g);
  return chineseMatches ? chineseMatches.length : 0;
}

/**
 * 验证单个文件名
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];

  // 1. 验证文件格式（仅PDF）
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  if (ext !== '.pdf') {
    errors.push('文件格式必须是PDF');
    return { isValid: false, errors }; // 格式错误直接返回，不再检查其他
  }

  // 2. 验证日期格式
  if (!hasValidDate(filename)) {
    errors.push(`缺少日期（需要：${getDateFormatHint()}）`);
  }

  // 3. 验证中文字符数量
  const chineseCount = countChineseChars(filename);
  if (chineseCount < 5) {
    errors.push(`中文字符不足（当前${chineseCount}个，需要至少5个）`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 批量验证文件名
 */
export function validateFilenames(filenames: string[]): FilenameValidationResult[] {
  return filenames.map(filename => {
    const result = validateFilename(filename);
    return {
      filename,
      isValid: result.isValid,
      errors: result.errors,
    };
  });
}

/**
 * 生成验证错误信息（格式化输出）
 */
export function generateValidationErrorMessage(results: FilenameValidationResult[]): string {
  const invalidResults = results.filter(r => !r.isValid);

  if (invalidResults.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('以下文件名不符合规范：');
  lines.push('');

  for (const result of invalidResults) {
    lines.push(`❌ ${result.filename}`);
    for (const error of result.errors) {
      lines.push(`   - ${error}`);
    }
    lines.push('');
  }

  lines.push('正确示例：');
  lines.push('✅ xx公司/厂商模具报价单20250101.pdf');
  lines.push('✅ xx厂商xx报价明细2025-01-01.pdf');

  return lines.join('\n');
}

/**
 * 生成验证错误信息（HTML格式）
 */
export function generateValidationErrorHtml(results: FilenameValidationResult[]): string {
  const invalidResults = results.filter(r => !r.isValid);

  if (invalidResults.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('<div style="color: #dc3545; margin-bottom: 16px;">');
  lines.push('<strong>⚠️ 以下文件名不符合规范：</strong>');
  lines.push('</div>');

  for (const result of invalidResults) {
    lines.push('<div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px;">');
    lines.push(`<div style="color: #dc3545; font-weight: bold;">❌ ${escapeHtml(result.filename)}</div>`);
    lines.push('<ul style="margin: 8px 0 0 20px; color: #666;">');
    for (const error of result.errors) {
      lines.push(`<li>${escapeHtml(error)}</li>`);
    }
    lines.push('</ul>');
    lines.push('</div>');
  }

  lines.push('<div style="margin-top: 16px; color: #28a745;">');
  lines.push('<strong>✅ 正确示例：</strong>');
  lines.push('<ul style="margin: 8px 0 0 20px;">');
  lines.push('<li>xx公司/厂商模具报价单20250101.pdf</li>');
  lines.push('<li>xx厂商xx报价明细2025-01-01.pdf</li>');
  lines.push('</ul>');
  lines.push('</div>');

  return lines.join('\n');
}

/**
 * 解析分页参数
 * 统一处理分页参数，限制最大值防止滥用
 */
export function parsePaginationParams(
  page?: string | number,
  pageSize?: string | number
): { page: number; pageSize: number; skip: number } {
  const pageNum = Math.max(1, typeof page === 'string' ? parseInt(page, 10) || 1 : page || 1);
  const limitNum = Math.min(100, Math.max(1, typeof pageSize === 'string' ? parseInt(pageSize, 10) || 10 : pageSize || 10));
  return { page: pageNum, pageSize: limitNum, skip: (pageNum - 1) * limitNum };
}

/**
 * HTML转义 - XSS防护
 * @param text 需要转义的文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  const div: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => div[m] || m);
}
