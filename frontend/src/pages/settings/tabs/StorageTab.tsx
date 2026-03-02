import { motion } from 'framer-motion';
import {
  HardDrive,
  Upload,
  Trash2,
  FileText,
  Image,
  Video,
  Database,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

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
};

interface StorageSettings {
  maxFileSize: number;
  allowedFileTypes: string[];
  autoCleanupEnabled: boolean;
  cleanupDays: number;
  storageLimit: number;
  compressImages: boolean;
}

const defaultSettings: StorageSettings = {
  maxFileSize: 50,
  allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
  autoCleanupEnabled: true,
  cleanupDays: 30,
  storageLimit: 1024,
  compressImages: true,
};

export function StorageTab() {
  const [settings, setSettings] = useState<StorageSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: StorageSettings;
        error?: { message: string };
      }>('/settings/storage');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      setError('加载存储设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { message: string };
      }>('/settings/storage', settings);
      if (response.success) {
        toast.success('存储设置保存成功');
      } else {
        setError(response.error?.message || '保存失败');
      }
    } catch (err) {
      setError('保存存储设置失败');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof StorageSettings>(
    key: K,
    value: StorageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="max-w-4xl space-y-6"
    >
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* 上传设置 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <CardTitle>上传设置</CardTitle>
            </div>
            <CardDescription>配置文件上传限制</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">单个文件大小限制（MB）</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min={1}
                  max={500}
                  value={settings.maxFileSize}
                  onChange={(e) =>
                    updateSetting('maxFileSize', parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageLimit">总存储空间限制（GB）</Label>
                <Input
                  id="storageLimit"
                  type="number"
                  min={1}
                  value={settings.storageLimit}
                  onChange={(e) =>
                    updateSetting('storageLimit', parseInt(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t">
              <div className="flex items-center gap-3">
                <Image className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">图片自动压缩</p>
                  <p className="text-sm text-gray-500">上传时自动压缩图片以节省空间</p>
                </div>
              </div>
              <Switch
                checked={settings.compressImages}
                onCheckedChange={(checked) =>
                  updateSetting('compressImages', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 存储统计 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <CardTitle>存储统计</CardTitle>
            </div>
            <CardDescription>各类文件存储使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-500">文档</p>
                <p className="text-lg font-semibold">128 MB</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-gray-500">图片</p>
                <p className="text-lg font-semibold">256 MB</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-gray-500">视频</p>
                <p className="text-lg font-semibold">512 MB</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <HardDrive className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-gray-500">其他</p>
                <p className="text-lg font-semibold">64 MB</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">存储空间使用</span>
                <span className="text-sm text-gray-500">960 MB / {settings.storageLimit} GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 自动清理 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle>自动清理</CardTitle>
            </div>
            <CardDescription>配置临时文件的自动清理规则</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">启用自动清理</p>
                <p className="text-sm text-gray-500">定期清理过期临时文件</p>
              </div>
              <Switch
                checked={settings.autoCleanupEnabled}
                onCheckedChange={(checked) =>
                  updateSetting('autoCleanupEnabled', checked)
                }
              />
            </div>

            {settings.autoCleanupEnabled && (
              <div className="space-y-2">
                <Label htmlFor="cleanupDays">清理周期（天）</Label>
                <Input
                  id="cleanupDays"
                  type="number"
                  min={1}
                  max={365}
                  value={settings.cleanupDays}
                  onChange={(e) =>
                    updateSetting('cleanupDays', parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-gray-500">
                  超过此天数的临时文件将被自动删除
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 保存按钮 */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving || loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
