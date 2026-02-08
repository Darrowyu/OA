import { useState } from "react"
import { motion } from "framer-motion"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const timeRanges = ["1个月", "3个月", "6个月", "1年"]

const milestoneData = [
  { month: "1月", target: 35, actual: 32 },
  { month: "2月", target: 42, actual: 38 },
  { month: "3月", target: 48, actual: 45 },
  { month: "4月", target: 55, actual: 52 },
  { month: "5月", target: 62, actual: 58 },
  { month: "6月", target: 70, actual: 65 },
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

export function MilestoneTracker() {
  const [activeRange, setActiveRange] = useState("6个月")

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
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                  activeRange === range
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={milestoneData}
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
      </div>
    </motion.div>
  )
}
