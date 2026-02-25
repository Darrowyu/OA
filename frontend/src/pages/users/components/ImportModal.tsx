import { useState, useRef, useCallback } from 'react';
import { Upload, Download, X, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CreateUserRequest } from '@/services/users';
import { useCSVParser } from '../hooks/useCSVParser';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: CreateUserRequest[]) => Promise<ImportResult>;
}

export function ImportModal({ open, onOpenChange, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CreateUserRequest[] | null>(null);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { parseFile, validateData } = useCSVParser();

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setParseErrors([]);
    setResult(null);
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setParsedData(null);
    setParseErrors([]);
    setLoading(true);

    try {
      const { data, errors } = await parseFile(selectedFile);

      setParsedData(data);
      setParseErrors(errors);

      // 验证数据
      if (data.length > 0) {
        const { valid, errors: validationErrors } = validateData(data);
        if (!valid) {
          setParseErrors((prev) => [
            ...prev,
            ...validationErrors.map((msg) => ({ row: 0, message: msg })),
          ]);
        }
      }

      if (data.length === 0 && errors.length > 0) {
        setError(`解析失败，发现 ${errors.length} 个错误`);
      }
    } catch (err) {
      setError('文件解析失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const importResult = await onImport(parsedData);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['username', 'name', 'email', 'role', 'employeeId', 'department', 'password'];
    const sample = ['zhangsan', '张三', 'zhangsan@example.com', 'USER', '1001', '技术部', '123456'];
    const csvContent = [headers.join(','), sample.join(',')].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '用户导入模板.csv';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        {/* 头部 - 系统默认配色 */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <DialogTitle className="text-xl text-gray-900 font-semibold">
                  批量导入用户
                </DialogTitle>
                <DialogDescription className="text-gray-500 mt-0.5">
                  通过 CSV 文件批量导入用户数据
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          {result ? (
            <div className="space-y-5">
              {/* 导入结果卡片 */}
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">导入完成</h3>
                <p className="text-sm text-gray-500">用户数据已成功导入系统</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 bg-green-50 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-green-600">{result.success}</p>
                  <p className="text-sm text-green-700 mt-1">导入成功</p>
                </div>
                {result.failed > 0 && (
                  <div className="flex-1 bg-red-50 p-4 rounded-xl text-center">
                    <p className="text-3xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-sm text-red-700 mt-1">导入失败</p>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    错误详情
                  </h4>
                  <ScrollArea className="h-[200px] border rounded-lg bg-white">
                    <div className="p-3 space-y-2">
                      {result.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                          <span className="text-red-400">•</span>
                          <span>第 {error.row} 行: {error.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button onClick={handleClose} className="min-w-[100px]">完成</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 模板下载提示 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">导入模板</p>
                      <p className="text-xs text-gray-500">下载模板文件，按照格式填写后上传</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
                    <Download className="mr-2 h-4 w-4" />
                    下载模板
                  </Button>
                </div>
              </div>

              {/* 文件上传区域 */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
                  file ? 'bg-gray-50' : ''
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setParsedData(null);
                        setParseErrors([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">点击或拖拽文件到此处上传</p>
                    <p className="text-xs text-gray-500 mt-1">目前仅支持 CSV 格式</p>
                  </>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {parseErrors.length > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">
                    解析时发现 {parseErrors.length} 个错误，已跳过这些行
                  </AlertDescription>
                </Alert>
              )}

              {/* 数据预览 */}
              {parsedData && parsedData.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      数据预览
                    </h4>
                    <span className="text-xs bg-white px-2 py-1 rounded-md text-gray-500">
                      共 {parsedData.length} 条记录
                    </span>
                  </div>
                  <ScrollArea className="h-[150px] border rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">用户名</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">姓名</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">邮箱</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">角色</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{row.username}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.email}</td>
                            <td className="px-3 py-2">{row.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 5 && (
                      <p className="text-xs text-gray-500 text-center py-2 border-t bg-gray-50">
                        还有 {parsedData.length - 5} 条记录...
                      </p>
                    )}
                  </ScrollArea>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="min-w-[80px]"
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!parsedData || parsedData.length === 0 || loading}
                  className="min-w-[100px]"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  开始导入
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
