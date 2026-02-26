import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Download, Trash2, FileArchive, HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useArchive } from '../hooks/useArchive';
import { formatFileSize } from '@/lib/utils';

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

export function ArchiveTab() {
  const { archives, stats, loading, error, loadArchives, createArchive, deleteArchive } = useArchive();

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

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

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">归档文件总数</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalArchives}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileArchive className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">已释放空间</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatFileSize(stats.totalSize)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <HardDrive className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">最后归档时间</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.lastArchiveDate
                  ? new Date(stats.lastArchiveDate).toLocaleString('zh-CN')
                  : '无'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 归档列表 */}
      <motion.div variants={itemVariants}>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>归档文件列表</CardTitle>
            <CardDescription>管理系统生成的归档文件</CardDescription>
          </div>
          <Button onClick={createArchive} disabled={loading}>
            <Archive className="h-4 w-4 mr-2" />
            创建新归档
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">文件名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">数据范围</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">大小</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">创建时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">加载中...</td>
                  </tr>
                ) : archives.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">暂无归档文件</td>
                  </tr>
                ) : (
                  archives.map((archive) => (
                    <tr key={archive.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{archive.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {archive.startDate} 至 {archive.endDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatFileSize(archive.size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{archive.createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteArchive(archive.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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
      </motion.div>
    </motion.div>
  );
}
