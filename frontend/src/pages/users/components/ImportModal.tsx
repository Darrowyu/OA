import { useState, useRef, useCallback } from 'react';
import { Upload, Download, X, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            批量导入用户
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-green-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-semibold text-green-600">{result.success}</p>
                <p className="text-sm text-green-700">导入成功</p>
              </div>
              {result.failed > 0 && (
                <div className="flex-1 bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-semibold text-red-600">{result.failed}</p>
                  <p className="text-sm text-red-700">导入失败</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">错误详情</h4>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {result.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                          <span>第 {error.row} 行: {error.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>完成</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>请下载模板文件，按照格式填写后上传</span>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  下载模板
                </Button>
              </AlertDescription>
            </Alert>

            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
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
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
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
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium">点击或拖拽文件到此处上传</p>
                  <p className="text-xs text-gray-500 mt-1">目前仅支持 CSV 格式</p>
                </>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  解析时发现 {parseErrors.length} 个错误，已跳过这些行
                </AlertDescription>
              </Alert>
            )}

            {parsedData && parsedData.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">数据预览</h4>
                    <span className="text-xs text-gray-500">共 {parsedData.length} 条记录</span>
                  </div>
                  <ScrollArea className="h-[150px] border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">用户名</th>
                          <th className="px-3 py-2 text-left">姓名</th>
                          <th className="px-3 py-2 text-left">邮箱</th>
                          <th className="px-3 py-2 text-left">角色</th>
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
                      <p className="text-xs text-gray-500 text-center py-2 border-t">
                        还有 {parsedData.length - 5} 条记录...
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parsedData || parsedData.length === 0 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                开始导入
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
