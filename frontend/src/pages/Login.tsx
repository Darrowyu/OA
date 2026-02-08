import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, LayoutDashboard, ArrowRight } from "lucide-react"
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

      if (!response.success) {
        throw new Error("登录失败")
      }

      const { user, accessToken, refreshToken } = response.data

      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))

      login(user, accessToken)

      navigate("/applications")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-coral text-white shadow-xl shadow-coral/30 mb-4">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">OA系统</h1>
          <p className="text-sm text-gray-500 mt-1">办公自动化管理平台</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">欢迎回来</h2>
            <p className="text-sm text-gray-500 mt-1">请登录您的账户</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 rounded-xl bg-red-50 border-red-200 text-red-700">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">用户名</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-11 h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-coral focus:ring-coral/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">密码</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-coral focus:ring-coral/20 transition-all"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-coral hover:bg-coral-dark shadow-lg shadow-coral/30 text-base font-medium transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              默认账号: <span className="font-mono text-gray-600">admin / admin123</span>
            </p>
          </div>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © 2024 OA系统. All rights reserved.
        </p>
      </div>
    </div>
  )
}
