import { Routes, Route, Navigate } from "react-router-dom"
import { EquipmentLayout } from "./layout"
import { EquipmentInfo } from "./info"
import { MaintenanceRecords } from "./maintenance/records"
import { MaintenancePlans } from "./maintenance/plans"
import { MaintenanceTemplates } from "./maintenance/templates"
import { PartsList } from "./parts/list"
import { PartsLifecycle } from "./parts/lifecycle"
import { PartsUsage } from "./parts/usage"
import { PartsScrap } from "./parts/scrap"
import { PartsStock } from "./parts/stock"
import { PartsStatistics } from "./parts/statistics"
import { EquipmentHealth } from "./health"
import { EquipmentCapacity } from "./capacity"

export function EquipmentModule() {
  return (
    <Routes>
      <Route element={<EquipmentLayout />}>
        {/* 设备信息 */}
        <Route index element={<EquipmentInfo />} />

        {/* 维修保养 */}
        <Route path="maintenance/records" element={<MaintenanceRecords />} />
        <Route path="maintenance/plans" element={<MaintenancePlans />} />
        <Route path="maintenance/templates" element={<MaintenanceTemplates />} />

        {/* 配件管理 */}
        <Route path="parts/list" element={<PartsList />} />
        <Route path="parts/lifecycle" element={<PartsLifecycle />} />
        <Route path="parts/usage" element={<PartsUsage />} />
        <Route path="parts/scrap" element={<PartsScrap />} />
        <Route path="parts/stock" element={<PartsStock />} />
        <Route path="parts/statistics" element={<PartsStatistics />} />

        {/* 设备健康度评估 */}
        <Route path="health" element={<EquipmentHealth />} />

        {/* 设备产能管理 */}
        <Route path="capacity" element={<EquipmentCapacity />} />

        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/equipment" replace />} />
      </Route>
    </Routes>
  )
}
