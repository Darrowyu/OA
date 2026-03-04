import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarDays,
  MoreHorizontal,
  Bell,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"
import { equipmentApi, MaintenancePlan, MaintenancePlanStatistics } from "@/services/equipment"

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  WARNING: { label: "即将到期", color: "bg-yellow-100 text-yellow-700", icon: <Bell className="h-3 w-3" /> },
  OVERDUE: { label: "已逾期", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  COMPLETED: { label: "已完成", color: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { label: "已取消", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3 w-3" /> },
}

export function MaintenancePlans() {
  const [searchQuery, setSearchQuery] = useState("")
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<MaintenancePlanStatistics>({
    total: 0,
    active: 0,
    warning: 0,
    overdue: 0,
  })

  const fetchPlans = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await equipmentApi.getMaintenancePlans({
        page: 1,
        pageSize: 100,
        keyword: searchQuery || undefined,
      })
      if (response.success) {
        setPlans(response.data.items)
      } else {
        setError("获取保养计划失败")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取保养计划失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await equipmentApi.getMaintenancePlanStatistics()
      if (response.success) {
        setStatistics(response.data)
      }
    } catch (err) {
      console.error("获取统计数据失败:", err)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchStatistics()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlans()
    }, 500) // 防抖500ms，避免频繁请求
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredPlans = useMemo(() =>
    plans.filter(
      (item) =>
        item.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.planName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [plans, searchQuery]
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="保养计划"
          description="管理设备定期保养计划，确保设备正常运行"
          buttonText="新建计划"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="计划总数" value={statistics.total} icon={CalendarDays} color="blue" />
        <StatCard label="正常" value={statistics.active} icon={CheckCircle2} color="green" />
        <StatCard label="即将到期" value={statistics.warning} icon={Bell} color="yellow" />
        <StatCard label="已逾期" value={statistics.overdue} icon={AlertCircle} color="red" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>保养计划列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索设备或计划名称..."
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>计划编号</TableHead>
                    <TableHead>设备名称</TableHead>
                    <TableHead>计划名称</TableHead>
                    <TableHead>保养频率</TableHead>
                    <TableHead>下次保养日期</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>提前提醒</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        暂无保养计划数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlans.map((item) => {
                      const status = statusMap[item.status] || statusMap.ACTIVE
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.equipment?.name || '-'}</TableCell>
                          <TableCell>{item.planName}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <Repeat className="h-3 w-3 text-gray-400" />
                              {item.frequency}
                            </span>
                          </TableCell>
                          <TableCell>{item.nextDate?.split('T')[0] || '-'}</TableCell>
                          <TableCell>{item.responsible}</TableCell>
                          <TableCell>{item.reminderDays ?? 0}天</TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              <span className="flex items-center gap-1">
                                {status.icon}
                                {status.label}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
