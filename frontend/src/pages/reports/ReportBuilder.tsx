import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Filter,
  Plus,
  Trash2,
  Eye,
  Save,
  Download,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { ReportType, ChartType, CustomReportConfig } from '@/types/reports';

// 可用的数据字段
const availableFields: Record<string, { label: string; fields: { key: string; label: string; type: string }[] }> = {
  application: {
    label: '审批数据',
    fields: [
      { key: 'id', label: '申请ID', type: 'string' },
      { key: 'title', label: '标题', type: 'string' },
      { key: 'status', label: '状态', type: 'enum' },
      { key: 'priority', label: '优先级', type: 'enum' },
      { key: 'applicantName', label: '申请人', type: 'string' },
      { key: 'applicantDept', label: '申请部门', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'submittedAt', label: '提交时间', type: 'date' },
      { key: 'completedAt', label: '完成时间', type: 'date' },
      { key: 'amount', label: '金额', type: 'number' },
    ],
  },
  equipment: {
    label: '设备数据',
    fields: [
      { key: 'id', label: '设备ID', type: 'string' },
      { key: 'code', label: '设备编号', type: 'string' },
      { key: 'name', label: '设备名称', type: 'string' },
      { key: 'category', label: '分类', type: 'string' },
      { key: 'status', label: '状态', type: 'enum' },
      { key: 'location', label: '位置', type: 'string' },
      { key: 'healthScore', label: '健康度', type: 'number' },
      { key: 'purchasePrice', label: '购买价格', type: 'number' },
      { key: 'purchaseDate', label: '购买日期', type: 'date' },
    ],
  },
  attendance: {
    label: '考勤数据',
    fields: [
      { key: 'id', label: '记录ID', type: 'string' },
      { key: 'userName', label: '姓名', type: 'string' },
      { key: 'department', label: '部门', type: 'string' },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'clockIn', label: '上班时间', type: 'time' },
      { key: 'clockOut', label: '下班时间', type: 'time' },
      { key: 'status', label: '状态', type: 'enum' },
      { key: 'workHours', label: '工时', type: 'number' },
    ],
  },
  user: {
    label: '用户数据',
    fields: [
      { key: 'id', label: '用户ID', type: 'string' },
      { key: 'name', label: '姓名', type: 'string' },
      { key: 'username', label: '用户名', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'department', label: '部门', type: 'string' },
      { key: 'role', label: '角色', type: 'enum' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
    ],
  },
};

// 报表模板
const reportTemplates = [
  {
    id: 'approval_efficiency',
    name: '审批效率分析',
    type: ReportType.APPROVAL,
    description: '分析各部门和审批人的审批效率',
    defaultChart: ChartType.BAR,
  },
  {
    id: 'equipment_utilization',
    name: '设备利用率报表',
    type: ReportType.EQUIPMENT,
    description: '统计设备使用情况和维护成本',
    defaultChart: ChartType.PIE,
  },
  {
    id: 'attendance_summary',
    name: '考勤汇总报表',
    type: ReportType.ATTENDANCE,
    description: '汇总员工考勤情况',
    defaultChart: ChartType.LINE,
  },
  {
    id: 'performance_evaluation',
    name: '绩效评估报表',
    type: ReportType.PERFORMANCE,
    description: '员工绩效综合分析',
    defaultChart: ChartType.PIE,
  },
];

export default function ReportBuilder() {
  const [config, setConfig] = useState<Partial<CustomReportConfig>>({
    type: 'approval',
    filters: {},
    dimensions: [],
    metrics: [],
    page: 1,
    pageSize: 50,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportName, setReportName] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>(ChartType.BAR);
  const [filters, setFilters] = useState<Array<{ field: string; operator: string; value: string }>>([]);

  // 应用模板
  const applyTemplate = (templateId: string) => {
    const template = reportTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setConfig({
      ...config,
      type: template.type,
    });
    setChartType(template.defaultChart);
    setReportName(template.name);

    // 根据模板类型预设字段
    const fields = availableFields[template.type]?.fields || [];
    setSelectedFields(fields.slice(0, 5).map((f) => f.key));

    toast.success(`已应用模板: ${template.name}`);
  };

  // 添加筛选条件
  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  // 更新筛选条件
  const updateFilter = (index: number, key: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [key]: value };
    setFilters(newFilters);
  };

  // 删除筛选条件
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // 切换字段选择
  const toggleField = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  // 生成报表
  const generateReport = () => {
    if (!reportName) {
      toast.error('请输入报表名称');
      return;
    }
    if (selectedFields.length === 0) {
      toast.error('请至少选择一个字段');
      return;
    }

    const finalConfig: CustomReportConfig = {
      type: config.type || 'approval',
      filters: filters.reduce((acc, f) => ({ ...acc, [f.field]: f.value }), {}),
      dimensions: selectedFields.filter((f) => !['amount', 'workHours', 'purchasePrice'].includes(f)),
      metrics: selectedFields.filter((f) => ['amount', 'workHours', 'purchasePrice'].includes(f)),
      page: 1,
      pageSize: 50,
    };

    console.log('生成报表配置:', finalConfig);
    toast.success('报表生成成功');
  };

  // 保存报表
  const saveReport = () => {
    if (!reportName) {
      toast.error('请输入报表名称');
      return;
    }
    toast.success('报表已保存');
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">自定义报表设计器</h1>
            <p className="text-gray-500 mt-1">设计并生成自定义数据报表</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveReport}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              预览
            </Button>
            <Button onClick={generateReport}>
              <BarChart3 className="h-4 w-4 mr-2" />
              生成报表
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：配置面板 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 报表名称 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>报表名称</Label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="输入报表名称"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>选择模板</Label>
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="选择报表模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col items-start">
                            <span>{template.name}</span>
                            <span className="text-xs text-gray-400">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 图表类型 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">图表类型</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: ChartType.BAR, icon: BarChart3, label: '柱状图' },
                    { type: ChartType.LINE, icon: LineChart, label: '折线图' },
                    { type: ChartType.PIE, icon: PieChart, label: '饼图' },
                    { type: ChartType.TABLE, icon: Table, label: '表格' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        chartType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 筛选条件 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">筛选条件</CardTitle>
                <Button variant="ghost" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {filters.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无筛选条件</p>
                ) : (
                  filters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(index, 'field', value)}
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue placeholder="字段" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(availableFields).flatMap(([type, data]) =>
                            data.fields.map((field) => (
                              <SelectItem key={`${type}.${field.key}`} value={`${type}.${field.key}`}>
                                {data.label} - {field.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) => updateFilter(index, 'operator', value)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">等于</SelectItem>
                          <SelectItem value="contains">包含</SelectItem>
                          <SelectItem value="gt">大于</SelectItem>
                          <SelectItem value="lt">小于</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        placeholder="值"
                        className="w-24 h-8"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeFilter(index)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：字段选择和预览 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 字段选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">选择数据字段</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(availableFields).map(([type, data]) => (
                    <AccordionItem key={type} value={type}>
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <span>{data.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedFields.filter((f) =>
                              data.fields.some((df) => df.key === f)
                            ).length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2 p-2">
                          {data.fields.map((field) => (
                            <label
                              key={field.key}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFields.includes(field.key)}
                                onChange={() => toggleField(field.key)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{field.label}</span>
                              <Badge variant="secondary" className="text-xs ml-auto">
                                {field.type}
                              </Badge>
                            </label>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* 预览区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">报表预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  {selectedFields.length === 0 ? (
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400">选择字段后预览报表</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      {chartType === ChartType.BAR && <BarChart3 className="h-16 w-16 text-blue-500 mx-auto mb-3" />}
                      {chartType === ChartType.LINE && <LineChart className="h-16 w-16 text-green-500 mx-auto mb-3" />}
                      {chartType === ChartType.PIE && <PieChart className="h-16 w-16 text-yellow-500 mx-auto mb-3" />}
                      {chartType === ChartType.TABLE && <Table className="h-16 w-16 text-gray-500 mx-auto mb-3" />}
                      <p className="text-gray-600 font-medium">{reportName || '未命名报表'}</p>
                      <p className="text-sm text-gray-400 mt-1">{selectedFields.length} 个字段已选择</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {selectedFields.map((field) => (
                          <Badge key={field} variant="secondary" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
