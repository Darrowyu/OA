import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import { Header } from "@/components/Header"

export function ApplicationsLayout() {
  useEffect(() => {
    // 可以在这里获取审批数量
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
