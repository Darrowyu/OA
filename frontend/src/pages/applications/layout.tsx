import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import { Header } from "@/components/Header"

export function ApplicationsLayout() {
  useEffect(() => {
    // 可以在这里获取审批数量
  }, [])

  return (
    <div className="flex-1 ml-[260px] h-screen overflow-auto">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  )
}
