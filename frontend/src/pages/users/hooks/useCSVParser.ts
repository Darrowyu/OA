import { useCallback } from 'react';
import { CreateUserRequest } from '@/services/users';
import { UserRole } from '@/types';

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  data: CreateUserRequest[];
  errors: ParseError[];
}

export interface UseCSVParserReturn {
  parseCSV: (content: string) => ParseResult;
  parseFile: (file: File) => Promise<ParseResult>;
  validateData: (data: CreateUserRequest[]) => { valid: boolean; errors: string[] };
}

// 必需字段
const REQUIRED_FIELDS = ['username', 'name', 'email', 'role', 'employeeid'];

// 邮箱验证正则
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 用户名验证正则
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function useCSVParser(): UseCSVParserReturn {
  // 解析CSV内容
  const parseCSV = useCallback((content: string): ParseResult => {
    const lines = content.split('\n').filter((line) => line.trim());
    const data: CreateUserRequest[] = [];
    const errors: ParseError[] = [];

    if (lines.length < 2) {
      errors.push({ row: 1, message: 'CSV文件至少需要包含表头和一行数据' });
      return { data, errors };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const missingFields = REQUIRED_FIELDS.filter((f) => !headers.includes(f));

    if (missingFields.length > 0) {
      errors.push({ row: 1, message: `缺少必需字段: ${missingFields.join(', ')}` });
      return { data, errors };
    }

    const colIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
      colIndex[h] = i;
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

      const username = values[colIndex['username']] || '';
      const name = values[colIndex['name']] || '';
      const email = values[colIndex['email']] || '';
      const role = (values[colIndex['role']] || '').toUpperCase();
      const employeeId = values[colIndex['employeeid']] || '';
      const department = values[colIndex['department']] || '';
      const password = values[colIndex['password']] || '';

      // 验证必填字段
      if (!username || !name || !email || !role || !employeeId) {
        errors.push({ row: i + 1, message: '存在空值字段' });
        continue;
      }

      // 验证用户名格式
      if (!USERNAME_REGEX.test(username)) {
        errors.push({ row: i + 1, message: `用户名格式不正确: ${username}` });
        continue;
      }

      // 验证角色有效性
      if (!Object.values(UserRole).includes(role as UserRole)) {
        errors.push({ row: i + 1, message: `无效的角色: ${role}` });
        continue;
      }

      // 验证邮箱格式
      if (!EMAIL_REGEX.test(email)) {
        errors.push({ row: i + 1, message: `无效的邮箱格式: ${email}` });
        continue;
      }

      data.push({
        username,
        name,
        email,
        role: role as UserRole,
        employeeId,
        departmentId: department || undefined,
        password: password || '123456',
      });
    }

    return { data, errors };
  }, []);

  // 解析文件
  const parseFile = useCallback(
    async (file: File): Promise<ParseResult> => {
      if (file.name.endsWith('.xlsx')) {
        return {
          data: [],
          errors: [{ row: 0, message: 'Excel 文件解析暂未实现，请先转换为 CSV 格式' }],
        };
      }

      if (!file.name.endsWith('.csv')) {
        return {
          data: [],
          errors: [{ row: 0, message: '不支持的文件格式，请上传 CSV 文件' }],
        };
      }

      try {
        const content = await file.text();
        return parseCSV(content);
      } catch (err) {
        return {
          data: [],
          errors: [{ row: 0, message: '文件解析失败，请检查文件格式' }],
        };
      }
    },
    [parseCSV]
  );

  // 验证数据
  const validateData = useCallback((data: CreateUserRequest[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (data.length === 0) {
      errors.push('没有有效的数据可导入');
      return { valid: false, errors };
    }

    // 检查重复用户名
    const usernames = new Map<string, number>();
    data.forEach((item, index) => {
      const count = usernames.get(item.username) || 0;
      usernames.set(item.username, count + 1);
      if (count > 0) {
        errors.push(`第 ${index + 1} 行: 用户名 "${item.username}" 重复`);
      }
    });

    // 检查重复邮箱
    const emails = new Map<string, number>();
    data.forEach((item, index) => {
      const count = emails.get(item.email) || 0;
      emails.set(item.email, count + 1);
      if (count > 0) {
        errors.push(`第 ${index + 1} 行: 邮箱 "${item.email}" 重复`);
      }
    });

    // 检查重复工号
    const employeeIds = new Map<string, number>();
    data.forEach((item, index) => {
      const count = employeeIds.get(item.employeeId) || 0;
      employeeIds.set(item.employeeId, count + 1);
      if (count > 0) {
        errors.push(`第 ${index + 1} 行: 工号 "${item.employeeId}" 重复`);
      }
    });

    return { valid: errors.length === 0, errors };
  }, []);

  return {
    parseCSV,
    parseFile,
    validateData,
  };
}
