import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange"
  subtext?: string
}

const colorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  yellow: "bg-yellow-100 text-yellow-600",
  red: "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
}

export function StatCard({ label, value, icon: Icon, color = "blue", subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
