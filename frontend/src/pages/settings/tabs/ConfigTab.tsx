import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Upload, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfig } from '../hooks/useConfig';
import { ConfigCategorySection } from '../components/ConfigCategorySection';
import { SystemConfig } from '@/types/config';

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

export function ConfigTab() {
  const {
    categories,
    configs,
    loading,
    error,
    loadCategories,
    loadConfigs,
    batchUpdateConfigs,
    exportConfigs,
    importConfigs,
  } = useConfig();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // 初始化加载
  useEffect(() => {
    loadCategories();
    loadConfigs();
  }, [loadCategories, loadConfigs]);

  // 当配置加载时，初始化表单值
  useEffect(() => {
    const values: Record<string, unknown> = {};
    configs.forEach((config) => {
      values[config.key] = config.value;
    });
    setConfigValues(values);
  }, [configs]);

  // 处理配置值变化
  const handleConfigChange = useCallback((key: string, value: unknown) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 处理分类保存
  const handleCategorySave = useCallback(
    async (categoryCode: string) => {
      const categoryConfigs = configs.filter(
        (c) => c.category?.code === categoryCode
      );
      const valuesToUpdate: Record<string, unknown> = {};

      categoryConfigs.forEach((config) => {
        const currentValue = configValues[config.key];
        const originalValue = config.value;
        if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
          valuesToUpdate[config.key] = currentValue;
        }
      });

      if (Object.keys(valuesToUpdate).length > 0) {
        await batchUpdateConfigs(valuesToUpdate, `更新 ${categoryCode} 分类配置`);
      }
    },
    [configs, configValues, batchUpdateConfigs]
  );

  // 处理分类重置
  const handleCategoryReset = useCallback(
    (categoryCode: string) => {
      const categoryConfigs = configs.filter(
        (c) => c.category?.code === categoryCode
      );
      const resetValues: Record<string, unknown> = { ...configValues };

      categoryConfigs.forEach((config) => {
        resetValues[config.key] = config.value;
      });

      setConfigValues(resetValues);
    },
    [configs, configValues]
  );

  // 处理导出
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      await exportConfigs(category);
    } finally {
      setIsExporting(false);
    }
  }, [selectedCategory, exportConfigs]);

  // 处理导入
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data.configs)) {
          await importConfigs({
            configs: data.configs,
            overwrite: true,
          });
        }
      } catch (err) {
        console.error('导入失败:', err);
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    },
    [importConfigs]
  );

  // 过滤配置
  const filteredConfigs = configs.filter((config) => {
    // 分类过滤
    if (selectedCategory !== 'all') {
      const category = categories.find((c) => c.code === selectedCategory);
      if (category && config.categoryId !== category.id) {
        return false;
      }
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        config.key.toLowerCase().includes(query) ||
        config.label.toLowerCase().includes(query) ||
        config.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // 按分类分组配置
  const configsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredConfigs.filter(
      (c) => c.categoryId === category.id
    );
    return acc;
  }, {} as Record<string, SystemConfig[]>);

  // 排序分类
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

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
      className="space-y-6"
    >
      {/* 错误提示 */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* 工具栏 */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <span className="font-medium">配置管理</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索配置项..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>

          {/* 分类筛选 */}
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full sm:w-auto"
          >
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">全部</TabsTrigger>
              {sortedCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.code}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadConfigs()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>

            <label>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
              <Button variant="outline" disabled={isImporting} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  导入
                </span>
              </Button>
            </label>
          </div>
        </div>
      </motion.div>

      {/* 配置分类区块 */}
      <motion.div variants={itemVariants} className="space-y-6">
        {sortedCategories.map((category) => {
          const categoryConfigs = configsByCategory[category.id] || [];
          if (categoryConfigs.length === 0) return null;

          return (
            <ConfigCategorySection
              key={category.id}
              category={category}
              configs={categoryConfigs}
              values={configValues}
              onChange={handleConfigChange}
              onSave={handleCategorySave}
              onReset={handleCategoryReset}
              loading={loading}
            />
          );
        })}
      </motion.div>

      {/* 空状态 */}
      {sortedCategories.length === 0 && !loading && (
        <motion.div variants={itemVariants} className="text-center py-12 bg-gray-50 rounded-lg">
          <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            暂无配置分类
          </h3>
          <p className="text-gray-500">请先创建配置分类和配置项</p>
        </motion.div>
      )}

      {/* 搜索结果为空 */}
      {searchQuery &&
        sortedCategories.every(
          (cat) => (configsByCategory[cat.id] || []).length === 0
        ) && (
          <motion.div variants={itemVariants} className="text-center py-12 bg-gray-50 rounded-lg">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              未找到匹配的配置项
            </h3>
            <p className="text-gray-500">请尝试其他关键词</p>
          </motion.div>
        )}
    </motion.div>
  );
}

export default ConfigTab;
