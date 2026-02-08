import { Routes, Route, Navigate } from "react-router-dom"
import { ApplicationsLayout } from "./layout"

// 页面组件
import { PendingList } from "./pending"
import { ApprovedList } from "./approved"
import { ApplicationDetail } from "./detail"
import { ApplicationList } from "./list"
import { ApplicationNew } from "./new"

export function ApplicationsModule() {
  return (
    <Routes>
      <Route element={<ApplicationsLayout />}>
        <Route index element={<ApplicationList />} />
        <Route path="new" element={<ApplicationNew />} />
        <Route path=":id" element={<ApplicationDetail />} />
        <Route path="pending" element={<PendingList />} />
        <Route path="approved" element={<ApprovedList />} />
        <Route path="*" element={<Navigate to="/approval" replace />} />
      </Route>
    </Routes>
  )
}
