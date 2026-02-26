import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, FileText, Eye, BarChart3, Calendar, User, Filter } from 'lucide-react';
import { Header } from '@/components/Header';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { auditApi, AuditLog, AuditStats } from '@/services/audit';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { logger } from '@/lib/logger';

// 操作类型标签映射
const actionLabelMap: Record<string, string> = {
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAILED: '登录失败',
  LOGOUT: '登出',
  CREATE_USER: '创建用户',
  UPDATE_USER: '更新用户',
  DELETE_USER: '删除用户',
  CREATE_APPLICATION: '创建申请',
  UPDATE_APPLICATION: '更新申请',
  DELETE_APPLICATION: '删除申请',
  APPROVE_APPLICATION: '审批通过',
  REJECT_APPLICATION: '审批驳回',
  CREATE_EQUIPMENT: '创建设备',
  UPDATE_EQUIPMENT: '更新设备',
  DELETE_EQUIPMENT: '删除设备',
  CREATE_MAINTENANCE: '创建维保记录',
  UPDATE_MAINTENANCE: '更新维保记录',
  DELETE_MAINTENANCE: '删除维保记录',
  EXPORT_DATA: '导出数据',
  IMPORT_DATA: '导入数据',
  SYSTEM_SETTING: '系统设置',
};

// 实体类型标签映射
const entityTypeLabelMap: Record<string, string> = {
  User: '用户',
  Application: '申请单',
  Equipment: '设备',
  MaintenanceRecord: '维保记录',
  MaintenancePlan: '保养计划',
  Part: '配件',
  PartUsage: '配件领用',
  PartScrap: '配件报废',
  Department: '部门',
  System: '系统',
};

// 操作类型颜色映射
const actionColorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOGIN_SUCCESS: 'default',
  LOGIN_FAILED: 'destructive',
  LOGOUT: 'secondary',
  CREATE_USER: 'default',
  UPDATE_USER: 'secondary',
  DELETE_USER: 'destructive',
  CREATE_APPLICATION: 'default',
  UPDATE_APPLICATION: 'secondary',
  DELETE_APPLICATION: 'destructive',
  APPROVE_APPLICATION: 'default',
  REJECT_APPLICATION: 'destructive',
  CREATE_EQUIPMENT: 'default',
  UPDATE_EQUIPMENT: 'secondary',
  DELETE_EQUIPMENT: 'destructive',
  CREATE_MAINTENANCE: 'default',
  UPDATE_MAINTENANCE: 'secondary',
  DELETE_MAINTENANCE: 'destructive',
  EXPORT_DATA: 'outline',
  IMPORT_DATA: 'outline',
  SYSTEM_SETTING: 'secondary',
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 检查权限
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // 获取审计日志列表
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        page: number;
        pageSize: number;
        search?: string;
        action?: string;
        entityType?: string;
        startDate?: string;
        endDate?: string;
      } = {
        page,
        pageSize,
      };

      if (searchKeyword) params.search = searchKeyword;
      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await auditApi.getAuditLogs(params);
      if (response.success) {
        setLogs(response.data);
        setTotal(response.meta.pagination.total);
        setTotalPages(response.meta.pagination.totalPages);
      } else {
        setError('获取审计日志失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取审计日志时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await auditApi.getAuditStats(startDate, endDate);
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      logger.error('获取统计数据失败', { error: err });
    }
  };

  // 获取筛选选项
  const fetchFilterOptions = async () => {
    try {
      const [actionsRes, entityTypesRes] = await Promise.all([
        auditApi.getAuditActions(),
        auditApi.getEntityTypes(),
      ]);
      if (actionsRes.success) {
        setActions(actionsRes.data);
      }
      if (entityTypesRes.success) {
        setEntityTypes(entityTypesRes.data);
      }
    } catch (err) {
      logger.error('获取筛选选项失败', { error: err });
    }
  };

  // 初始加载
  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
      fetchStats();
      fetchFilterOptions();
    }
  }, [isAdmin]);

  // 筛选条件变化时重新加载
  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [page, actionFilter, entityTypeFilter, startDate, endDate]);

  // 搜索防抖
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchLogs();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 查看详情
  const handleViewDetail = async (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailDialogOpen(true);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setSearchKeyword('');
    setActionFilter('');
    setEntityTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  // 格式化JSON
  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <motion.main
        className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 页面标题 */}
          <motion.div
            className="flex items-center justify-between"
            variants={itemVariants}
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
              <p className="text-sm text-gray-500 mt-1">查看系统操作记录和审计信息</p>
            </div>
            <Button variant="outline" onClick={() => fetchLogs()} disabled={loading}>
              {loading ? '加载中...' : '刷新'}
            </Button>
          </motion.div>

          {/* 统计卡片 */}
          {stats && (
            <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4" variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总日志数</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">今日日志</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayLogs.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">操作类型</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.actionStats.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">实体类型</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.entityTypeStats.length}</div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 筛选器 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                筛选条件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索用户、操作或描述..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  options={[
                    { value: '', label: '全部操作' },
                    ...actions.map((action) => ({
                      value: action,
                      label: actionLabelMap[action] || action,
                    })),
                  ]}
                />
                <Select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  options={[
                    { value: '', label: '全部实体' },
                    ...entityTypes.map((type) => ({
                      value: type,
                      label: entityTypeLabelMap[type] || type,
                    })),
                  ]}
                />
                <Input
                  type="date"
                  placeholder="开始日期"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="结束日期"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  重置筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 日志列表 */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>实体类型</TableHead>
                    <TableHead>实体ID</TableHead>
                    <TableHead>IP地址</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        暂无审计日志
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-gray-500">{log.user.department || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionColorMap[log.action] || 'default'}>
                            {actionLabelMap[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entityTypeLabelMap[log.entityType] || log.entityType}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[150px] truncate">
                          {log.entityId || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                          {log.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 分页 */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    共 {total} 条记录，第 {page} / {totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.main>

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>审计日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">日志ID:</span>
                  <p className="font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">操作时间:</span>
                  <p>{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">操作用户:</span>
                  <p>{selectedLog.user.name} ({selectedLog.user.username})</p>
                </div>
                <div>
                  <span className="text-gray-500">部门:</span>
                  <p>{selectedLog.user.department || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">操作类型:</span>
                  <p>
                    <Badge variant={actionColorMap[selectedLog.action] || 'default'}>
                      {actionLabelMap[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">实体类型:</span>
                  <p>{entityTypeLabelMap[selectedLog.entityType] || selectedLog.entityType}</p>
                </div>
                <div>
                  <span className="text-gray-500">实体ID:</span>
                  <p className="font-mono">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">IP地址:</span>
                  <p>{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <span className="text-gray-500 text-sm">描述:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-sm">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <span className="text-gray-500 text-sm">User-Agent:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.oldValues && (
                <div>
                  <span className="text-gray-500 text-sm">旧值:</span>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono overflow-auto">
                    {formatJson(selectedLog.oldValues)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <span className="text-gray-500 text-sm">新值:</span>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono overflow-auto">
                    {formatJson(selectedLog.newValues)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
