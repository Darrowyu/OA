import { useState } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Save } from "lucide-react"

export function Settings() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [systemSettings, setSystemSettings] = useState({
    companyName: "",
    systemName: "OA系统",
    logoUrl: "",
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // TODO: 调用保存设置API
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle>系统设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">基本设置</h3>
                <div className="grid gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">公司名称</Label>
                    <Input
                      id="companyName"
                      value={systemSettings.companyName}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="请输入公司名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemName">系统名称</Label>
                    <Input
                      id="systemName"
                      value={systemSettings.systemName}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          systemName: e.target.value,
                        })
                      }
                      placeholder="请输入系统名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo地址</Label>
                    <Input
                      id="logoUrl"
                      value={systemSettings.logoUrl}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          logoUrl: e.target.value,
                        })
                      }
                      placeholder="请输入Logo URL"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">邮件通知</h3>
                <div className="text-gray-500">邮件通知设置功能开发中...</div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">安全设置</h3>
                <div className="text-gray-500">安全设置功能开发中...</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
