import { useState, useEffect } from "react"
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
  RefreshCw,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Loader2,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"
import { equipmentApi, PartLifecycle, LifecycleStatistics } from "@/services/equipment"

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "即将到期", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "急需更换", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  expired: { label: "已到期", color: "bg-gray-100 text-gray-700", icon: <XCircle className="h-3 w-3" /> },
}

export function PartsLifecycle() {
  const [searchQuery, setSearchQuery] = useState("")
  const [lifecycleData, setLifecycleData] = useState<PartLifecycle[]>([])
  const [statistics, setStatistics] = useState<LifecycleStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLifecycleData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [lifecycleRes, statsRes] = await Promise.all([
        equipmentApi.getPartLifecycle(),
        equipmentApi.getPartLifecycleStatistics(),
      ])
      if (lifecycleRes.success) {
        setLifecycleData(lifecycleRes.data.items)
      } else {
        setError("获取配件生命周期数据失败")
      }
      if (statsRes.success) {
        setStatistics(statsRes.data)
      }
    } catch (err) {
      setError("获取数据时发生错误")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLifecycleData()
  }, [])

  const filteredData = lifecycleData.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRefresh = () => {
    fetchLifecycleData()
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader title="生命周期" description="追踪配件使用周期和寿命预测" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="监控配件"
          value={statistics?.total ?? 0}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="正常"
          value={statistics?.active ?? 0}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="即将到期"
          value={(statistics?.warning ?? 0) + (statistics?.critical ?? 0)}
          icon={AlertCircle}
          color="yellow"
        />
        <StatCard
          label="平均寿命周期"
          value={`${Math.round(statistics?.averageUsage ?? 0)}%`}
          icon={TrendingUp}
          color="purple"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>配件生命周期追踪</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索配件名称或编号..."
                extraButton={{ icon: RefreshCw, onClick: handleRefresh, disabled: loading }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-red-600">
                <AlertCircle className="h-8 w-8 mb-2" />
                <span>{error}</span>
                <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                  重试
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>配件编号</TableHead>
                    <TableHead>配件名称</TableHead>
                    <TableHead>型号</TableHead>
                    <TableHead>总周期</TableHead>
                    <TableHead>已使用</TableHead>
                    <TableHead>剩余</TableHead>
                    <TableHead>预计到期</TableHead>
                    <TableHead>寿命进度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => {
                      const status = statusMap[item.status]
                      const usagePercent = (item.installedCycles / item.totalCycles) * 100
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.partId}</TableCell>
                          <TableCell>{item.partName}</TableCell>
                          <TableCell>{item.partModel}</TableCell>
                          <TableCell>{item.totalCycles}</TableCell>
                          <TableCell>{item.installedCycles}</TableCell>
                          <TableCell className={item.remainingCycles < 100 ? "text-red-600 font-medium" : ""}>
                            {item.remainingCycles}
                          </TableCell>
                          <TableCell>{item.expectedEndDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{usagePercent.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              <span className="flex items-center gap-1">{status.icon}{status.label}</span>
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
