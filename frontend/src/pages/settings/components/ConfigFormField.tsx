import { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SystemConfig, ConfigValidation, ConfigOption } from '@/types/config';

interface ConfigFormFieldProps {
  config: SystemConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

// 解析验证规则
const parseValidation = (validationStr?: string): ConfigValidation => {
  if (!validationStr) return {};
  try {
    return JSON.parse(validationStr) as ConfigValidation;
  } catch {
    return {};
  }
};

// 解析选项
const parseOptions = (optionsStr?: string): ConfigOption[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr) as ConfigOption[];
  } catch {
    return [];
  }
};

// 验证值
const validateValue = (
  value: unknown,
  valueType: string,
  validation?: ConfigValidation
): string | null => {
  if (!validation) return null;

  // 必填验证
  if (validation.required) {
    if (value === undefined || value === null || value === '') {
      return validation.customMessage || '此项为必填项';
    }
  }

  // 根据类型验证
  switch (valueType) {
    case 'STRING':
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          return `最少需要 ${validation.minLength} 个字符`;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `最多允许 ${validation.maxLength} 个字符`;
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            return validation.customMessage || '格式不正确';
          }
        }
        if (validation.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return '请输入有效的邮箱地址';
          }
        }
        if (validation.url) {
          try {
            new URL(value);
          } catch {
            return '请输入有效的URL地址';
          }
        }
      }
      break;

    case 'NUMBER':
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return `最小值为 ${validation.min}`;
        }
        if (validation.max !== undefined && value > validation.max) {
          return `最大值为 ${validation.max}`;
        }
      }
      break;

    case 'ARRAY':
      if (Array.isArray(value)) {
        if (validation.minLength && value.length < validation.minLength) {
          return `最少需要选择 ${validation.minLength} 项`;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `最多允许选择 ${validation.maxLength} 项`;
        }
      }
      break;
  }

  return null;
};

export function ConfigFormField({
  config,
  value,
  onChange,
  disabled = false,
}: ConfigFormFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validation = useMemo(() => parseValidation(config.validation), [config.validation]);
  const options = useMemo(() => parseOptions(config.options), [config.options]);

  // 验证值变化
  useEffect(() => {
    const errorMsg = validateValue(value, config.valueType, validation);
    setError(errorMsg);
  }, [value, config.valueType, validation]);

  // 根据类型渲染不同的表单控件
  const renderField = () => {
    switch (config.valueType) {
      case 'STRING':
        // 如果有选项，使用下拉选择
        if (options.length > 0) {
          return (
            <Select
              value={String(value || '')}
              onValueChange={onChange}
              disabled={disabled || !config.isEditable}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // 加密字段使用密码输入
        if (config.isEncrypted) {
          return (
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled || !config.isEditable}
                className={error ? 'border-red-500 pr-10' : 'pr-10'}
                placeholder={config.description || '请输入'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        }

        // 长文本使用 textarea
        if (validation.maxLength && validation.maxLength > 100) {
          return (
            <Textarea
              value={String(value || '')}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || !config.isEditable}
              className={error ? 'border-red-500' : ''}
              placeholder={config.description || '请输入'}
              rows={4}
            />
          );
        }

        return (
          <Input
            type={validation.email ? 'email' : validation.url ? 'url' : 'text'}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || !config.isEditable}
            className={error ? 'border-red-500' : ''}
            placeholder={config.description || '请输入'}
          />
        );

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value === undefined || value === null ? '' : Number(value)}
            onChange={(e) => {
              const numValue = e.target.value === '' ? null : Number(e.target.value);
              onChange(numValue);
            }}
            disabled={disabled || !config.isEditable}
            className={error ? 'border-red-500' : ''}
            min={validation.min}
            max={validation.max}
            placeholder={config.description || '请输入数字'}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={onChange}
              disabled={disabled || !config.isEditable}
            />
            <span className="text-sm text-gray-500">
              {value ? '已启用' : '已禁用'}
            </span>
          </div>
        );

      case 'JSON':
        return (
          <Textarea
            value={
              typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value || '')
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
                setError(null);
              } catch {
                onChange(e.target.value);
                setError('JSON 格式不正确');
              }
            }}
            disabled={disabled || !config.isEditable}
            className={error ? 'border-red-500 font-mono' : 'font-mono'}
            placeholder={'{\n  "key": "value"\n}'}
            rows={6}
          />
        );

      case 'ARRAY':
        // 数组类型，如果提供了选项则使用多选
        if (options.length > 0) {
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div className="space-y-2">
              {options.map((option) => (
                <div key={String(option.value)} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${config.key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selectedValues, option.value]);
                      } else {
                        onChange(selectedValues.filter((v) => v !== option.value));
                      }
                    }}
                    disabled={disabled || !config.isEditable}
                    className="rounded border-gray-300"
                  />
                  <Label
                    htmlFor={`${config.key}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          );
        }

        // 否则使用文本域输入，每行一个值
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : ''}
            onChange={(e) => {
              const lines = e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
              onChange(lines);
            }}
            disabled={disabled || !config.isEditable}
            className={error ? 'border-red-500' : ''}
            placeholder="每行输入一个值"
            rows={4}
          />
        );

      default:
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || !config.isEditable}
            className={error ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {config.label}
          {validation.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {config.defaultValue !== undefined && (
          <span className="text-xs text-gray-400">
            默认: {String(config.defaultValue)}
          </span>
        )}
      </div>

      {config.description && (
        <p className="text-xs text-gray-500">{config.description}</p>
      )}

      {renderField()}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ConfigFormField;
