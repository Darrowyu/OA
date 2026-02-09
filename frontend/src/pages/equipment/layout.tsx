import { Outlet } from "react-router-dom"
import { Header } from "@/components/Header"

export function EquipmentLayout() {
  return (
    <div className="h-screen overflow-auto">
      <Header />
      <main className="p-4 md:p-6 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  )
}
