import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { authApi } from "@/services/auth"
import { useAuth } from "@/contexts/AuthContext"

interface LoginFormData {
  username: string
  password: string
}

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({ username: "", password: "" })
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await authApi.login(formData)
      if (!response.success) throw new Error("登录失败")

      const { user, accessToken, refreshToken } = response.data
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))
      login(user, accessToken)
      navigate("/approval")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Makrite OA</h1>
          <p className="text-sm text-slate-500 mt-1">办公自动化管理系统</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-medium text-slate-900 mb-6">登录</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm text-slate-700">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="h-10 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-slate-700">密码</Label>
                <button
                  type="button"
                  onClick={() => navigate("/change-password")}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  修改密码
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-10 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              默认账号: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">admin / admin123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 Makrite OA System
        </p>
      </div>
    </div>
  )
}
