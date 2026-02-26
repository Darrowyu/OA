import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Lock } from "lucide-react"
import { authApi } from "@/services/auth"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

interface PasswordFormData {
  username: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function ChangePassword() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<PasswordFormData>({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (formData.newPassword !== formData.confirmPassword) {
      setError("两次输入的新密码不一致")
      return
    }

    if (formData.newPassword.length < 6) {
      setError("新密码至少需要6个字符")
      return
    }

    setIsLoading(true)

    try {
      const response = await authApi.changePasswordPublic({
        username: formData.username,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })

      if (!response.success) {
        throw new Error(response.message || "密码修改失败")
      }

      setSuccess("密码修改成功！即将返回登录页面...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "密码修改失败，请检查用户名和原密码")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">修改密码</h1>
          <p className="text-sm text-slate-500 mt-1">更新您的账户密码</p>
        </motion.div>

        {/* 修改密码卡片 */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </motion.div>
          )}

          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="currentPassword" className="text-sm text-slate-700">原密码</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="请输入原密码"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="h-10 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm text-slate-700">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="至少6个字符"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="h-10 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm text-slate-700">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                  修改中...
                </>
              ) : (
                <>
                  修改密码
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex items-center justify-center w-full text-sm text-slate-500 hover:text-blue-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回登录页面
            </button>
          </motion.div>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-xs text-slate-400 mt-6">
          © 2024 Makrite OA System
        </motion.p>
      </motion.div>
    </div>
  )
}
