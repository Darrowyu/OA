import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Filter, RefreshCw, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemLogs } from '../hooks/useSystemLogs';
import type { SystemLog } from '../types';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const levelIcons = {
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
};

const levelColors = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

const levelLabels = {
  info: '信息',
  warn: '警告',
  error: '错误',
};

export function LogsTab() {
  const { logs, loading, error, filters, loadLogs, exportLogs, setFilters, clearFilters } = useSystemLogs();
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="space-y-6"
    >
      {/* 错误提示 */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* 筛选栏 */}
      <motion.div variants={itemVariants}>
        <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">筛选：</span>
            </div>

            <Select value={filters.level} onValueChange={(v) => setFilters({ ...filters, level: v })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="日志级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部级别</SelectItem>
                <SelectItem value="info">信息</SelectItem>
                <SelectItem value="warn">警告</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>

            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="开始日期"
            />

            <span className="text-gray-400">至</span>

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="结束日期"
            />

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              清除筛选
            </Button>

            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>

            <Button size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* 日志列表 */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle>日志列表</CardTitle>
          </div>
          <CardDescription>共 {logs.length} 条日志记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">级别</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">来源</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">消息</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        加载中...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        暂无日志记录
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const Icon = levelIcons[log.level];
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={levelColors[log.level]}>
                              <Icon className="h-3 w-3 mr-1" />
                              {levelLabels[log.level]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.source}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                            {log.message}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志详情弹窗 */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">日志详情</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">时间</label>
                  <p className="text-gray-900">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">级别</label>
                  <Badge variant="outline" className={levelColors[selectedLog.level]}>
                    {levelLabels[selectedLog.level]}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">来源</label>
                  <p className="text-gray-900">{selectedLog.source}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">消息</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedLog.message}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </motion.div>
    </motion.div>
  );
}
