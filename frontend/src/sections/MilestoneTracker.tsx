import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { dashboardApi } from "@/services/dashboard"
import { ActivityTimeRange } from "@/types/dashboard"

const timeRanges: { label: string; value: ActivityTimeRange }[] = [
  { label: "1个月", value: "1month" },
  { label: "3个月", value: "3months" },
  { label: "6个月", value: "6months" },
  { label: "1年", value: "1year" },
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span>目标: {payload[0]?.value} 项</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>实际: {payload[1]?.value} 项</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

interface ChartData {
  month: string;
  target: number;
  actual: number;
}

export function MilestoneTracker() {
  const [activeRange, setActiveRange] = useState<ActivityTimeRange>("6months")
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true)
      try {
        const response = await dashboardApi.getTaskStatistics(activeRange)
        if (response.success) {
          setChartData(response.data.data)
        }
      } catch {
        // 静默处理错误，UI已显示空状态
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [activeRange])

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // 只有当尺寸大于0时才更新状态
        if (width > 0 && height > 0) {
          setContainerSize({ width, height })
        }
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">任务完成统计</h3>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setActiveRange(range.value)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                  activeRange === range.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          暂无统计数据
        </div>
      ) : (
        <div ref={containerRef} className="h-48 min-h-[192px]">
          {containerSize.width > 0 && containerSize.height > 0 && (
            <ResponsiveContainer width={containerSize.width} height={containerSize.height}>
              <BarChart
                data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F3F4F6" }} />
              <Bar
                dataKey="target"
                fill="#4B5563"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="actual"
                fill="#F97316"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        </div>
      )}
    </motion.div>
  )
}
