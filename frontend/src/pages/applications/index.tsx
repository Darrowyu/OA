import { Routes, Route, Navigate } from "react-router-dom"
import { ApplicationsLayout } from "./layout"

// 页面组件
import { PendingList } from "./pending"
import { ApprovedList } from "./approved"
import { ApplicationDetail } from "./detail"
import { ApplicationList } from "./list"
import { ApplicationNew } from "./new"
import { ApplicationTypeSelect } from "./type-select"
import { ProductDevelopmentNew } from "./product-development-new"
import { FeasibilityNew } from "./feasibility-new"
import { BusinessTripNew } from "./business-trip-new"

export function ApplicationsModule() {
  return (
    <Routes>
      <Route element={<ApplicationsLayout />}>
        <Route index element={<ApplicationList />} />
        <Route path="new" element={<ApplicationTypeSelect />} />
        <Route path="new/standard" element={<ApplicationNew />} />
        <Route path="new/product-development" element={<ProductDevelopmentNew />} />
        <Route path="new/feasibility" element={<FeasibilityNew />} />
        <Route path="new/business-trip" element={<BusinessTripNew />} />
        <Route path=":id" element={<ApplicationDetail />} />
        <Route path="pending" element={<PendingList />} />
        <Route path="approved" element={<ApprovedList />} />
        <Route path="*" element={<Navigate to="/approval" replace />} />
      </Route>
    </Routes>
  )
}
