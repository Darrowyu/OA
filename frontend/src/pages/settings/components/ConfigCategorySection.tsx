import { useState } from 'react';
import { ChevronDown, ChevronUp, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ConfigCategory, SystemConfig } from '@/types/config';
import { ConfigFormField } from './ConfigFormField';

interface ConfigCategorySectionProps {
  category: ConfigCategory;
  configs: SystemConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onSave?: (categoryCode: string) => Promise<void>;
  onReset?: (categoryCode: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function ConfigCategorySection({
  category,
  configs,
  values,
  onChange,
  onSave,
  onReset,
  loading = false,
  error = null,
}: ConfigCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 只显示可见且可编辑的配置项
  const visibleConfigs = configs.filter(
    (config) => config.isVisible && config.categoryId === category.id
  );

  // 按 sortOrder 排序
  const sortedConfigs = [...visibleConfigs].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(category.code);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!onReset) return;
    onReset(category.code);
  };

  // 检查是否有任何值被修改
  const hasChanges = sortedConfigs.some((config) => {
    const currentValue = values[config.key];
    const originalValue = config.value;
    return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
  });

  if (sortedConfigs.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-50/50 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <div>
              <CardTitle className="text-lg">{category.name}</CardTitle>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                有未保存的更改
              </span>
            )}
            <span className="text-xs text-gray-400">
              {sortedConfigs.length} 项配置
            </span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {sortedConfigs.map((config, index) => (
                <div key={config.id}>
                  <ConfigFormField
                    config={config}
                    value={values[config.key]}
                    onChange={(value) => onChange(config.key, value)}
                    disabled={loading || isSaving}
                  />
                  {index < sortedConfigs.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>

          <div className="px-6 py-4 bg-gray-50/50 border-t flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading || isSaving || !hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || isSaving || !hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export default ConfigCategorySection;
