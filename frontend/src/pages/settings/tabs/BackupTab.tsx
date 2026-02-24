import { useEffect } from 'react';
import { Database, Download, RotateCcw, Plus, Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBackup } from '../hooks/useBackup';

export function BackupTab() {
  const {
    backups,
    loading,
    autoBackup,
    error,
    loadBackups,
    createBackup,
    restoreBackup,
    downloadBackup,
    saveAutoBackup,
  } = useBackup();

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 自动备份开关 */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-600 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">自动备份</h3>
                <p className="text-sm text-gray-500">每天凌晨 2:00 自动创建系统备份</p>
              </div>
            </div>
            <Switch checked={autoBackup} onCheckedChange={saveAutoBackup} />
          </div>
        </CardContent>
      </Card>

      {/* 备份列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>备份列表</CardTitle>
            </div>
            <CardDescription>管理系统备份文件</CardDescription>
          </div>
          <Button onClick={createBackup} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            立即备份
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">备份时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">大小</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">加载中...</td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">暂无备份</td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{backup.createdAt}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            backup.type === 'auto'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {backup.type === 'auto' ? '自动' : '手动'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{backup.size}</td>
                      <td className="px-4 py-3">
                        {backup.status === 'completed' ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <Check className="h-4 w-4 mr-1" />
                            完成
                          </span>
                        ) : backup.status === 'failed' ? (
                          <span className="inline-flex items-center text-red-600 text-sm">
                            <X className="h-4 w-4 mr-1" />
                            失败
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-blue-600 text-sm">
                            <Clock className="h-4 w-4 mr-1 animate-spin" />
                            进行中
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadBackup(backup.id)}
                            disabled={backup.status !== 'completed'}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreBackup(backup.id)}
                            disabled={backup.status !== 'completed'}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
