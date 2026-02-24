import { useEffect } from 'react';
import { Monitor, Cpu, Database, Clock, Server, HardDrive, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemInfo } from '../hooks/useSystemInfo';

export function SystemTab() {
  const { info, loading, error, loadInfo } = useSystemInfo();

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        加载系统信息...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">系统版本</p>
                <p className="text-xl font-bold text-gray-900">{info.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Clock className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">运行时间</p>
                <p className="text-xl font-bold text-gray-900">{info.uptime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Cpu className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Node.js</p>
                <p className="text-xl font-bold text-gray-900">{info.nodeVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Database className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">数据库</p>
                <p className="text-xl font-bold text-gray-900">{info.database?.size || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              <CardTitle>系统环境</CardTitle>
            </div>
            <CardDescription>服务器运行环境信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">操作系统</span>
              <span className="font-medium">{info.platform || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">架构</span>
              <span className="font-medium">{info.arch || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">主机名</span>
              <span className="font-medium">{info.hostname || '-'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">进程 PID</span>
              <span className="font-medium">{info.pid || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-emerald-600" />
              <CardTitle>内存使用</CardTitle>
            </div>
            <CardDescription>应用程序内存占用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">已使用</span>
              <span className="font-medium">{info.memory?.used || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">总计</span>
              <span className="font-medium">{info.memory?.total || '-'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">使用率</span>
              <span className="font-medium">
                {info.memory?.usedBytes && info.memory?.totalBytes
                  ? `${Math.round((info.memory.usedBytes / info.memory.totalBytes) * 100)}%`
                  : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据库信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            <CardTitle>数据库信息</CardTitle>
          </div>
          <CardDescription>PostgreSQL 数据库连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">数据库类型</span>
              <span className="font-medium">{info.database?.type || 'PostgreSQL'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">版本</span>
              <span className="font-medium">{info.database?.version || '-'}</span>
            </div>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">数据库大小</span>
            <span className="font-medium">{info.database?.size || '-'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
