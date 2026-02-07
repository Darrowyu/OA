import { Routes, Route, Navigate } from "react-router-dom"
import { Applications } from "@/pages/Applications"
import { ApplicationDetail } from "@/pages/ApplicationDetail"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/applications" replace />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/applications/:id" element={<ApplicationDetail />} />
    </Routes>
  )
}

export default App
