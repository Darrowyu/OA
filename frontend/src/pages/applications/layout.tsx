import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { applicationsApi } from "@/services/applications"

export function ApplicationsLayout() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await applicationsApi.getApplications({ page: 1, pageSize: 1 })
        setPendingCount(response.data.pagination?.total || 0)
      } catch (error) {
        console.error("获取待审批数量失败:", error)
      }
    }
    fetchPendingCount()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar pendingCount={pendingCount} />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
