import { useEffect } from 'react';
import { Archive, RefreshCw, Play, ChevronDown, ChevronUp, FileText, Database, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useArchive } from '../hooks/useArchive';

export function ArchiveModule() {
  const {
    archiveStats,
    archiveFiles,
    showArchiveFiles,
    archiveLoading,
    loadArchiveStats,
    handleArchive,
    toggleArchiveFiles,
  } = useArchive();

  useEffect(() => {
    loadArchiveStats();
  }, [loadArchiveStats]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-blue-600" />
          <CardTitle>数据归档管理</CardTitle>
        </div>
        <CardDescription>管理系统数据归档，优化数据库性能</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">活跃申请</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{archiveStats.activeCount}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Archive className="h-4 w-4" />
              <span className="text-sm font-medium">已归档</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{archiveStats.archivedCount}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">主文件大小</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{archiveStats.dbSize}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">可归档数量</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{archiveStats.archivableCount}</div>
          </div>
        </div>

        {/* 归档说明 */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-2">归档说明：</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>归档将已完成的申请数据转移到独立文件</li>
            <li>归档后数据仍可在历史记录中查看</li>
            <li>建议每月执行一次归档以保持系统性能</li>
            <li>归档文件可随时导出或恢复</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadArchiveStats} disabled={archiveLoading} className="flex-1">
            <RefreshCw className={`h-4 w-4 mr-2 ${archiveLoading ? 'animate-spin' : ''}`} />
            刷新统计
          </Button>
          <Button
            onClick={handleArchive}
            disabled={archiveLoading || archiveStats.archivableCount === 0}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            执行归档
          </Button>
        </div>

        {/* 归档文件列表 */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={toggleArchiveFiles}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-700">归档文件列表</span>
            {showArchiveFiles ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {showArchiveFiles && (
            <div className="p-4 space-y-2">
              {archiveFiles.length === 0 ? (
                <p className="text-center text-gray-500 py-4">暂无归档文件</p>
              ) : (
                archiveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{file.filename}</p>
                        <p className="text-xs text-gray-500">
                          {file.createdAt} · {file.size} · {file.recordCount} 条记录
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      下载
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
