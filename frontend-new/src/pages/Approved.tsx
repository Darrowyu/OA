import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Eye } from "lucide-react"
import { Application } from "@/types"

export function Approved() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchApprovedApplications()
  }, [])

  const fetchApprovedApplications = async () => {
    try {
      setIsLoading(true)
      // TODO: 调用已审核API
      setApplications([])
    } catch (error) {
      console.error("获取已审核列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      APPROVED: { label: "已通过", variant: "default" },
      REJECTED: { label: "已驳回", variant: "destructive" },
    }
    const config = statusMap[status] || { label: status, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle>已审核申请</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请编号</TableHead>
                    <TableHead>申请类型</TableHead>
                    <TableHead>申请人</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>审核结果</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        暂无已审核申请
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.serialNumber}</TableCell>
                        <TableCell>{app.type}</TableCell>
                        <TableCell>{app.applicant?.name || app.applicant?.username}</TableCell>
                        <TableCell>
                          {app.updatedAt
                            ? new Date(app.updatedAt).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/applications/${app.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
