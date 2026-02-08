// frontend/src/pages/tasks/index.tsx
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { DropResult } from '@hello-pangea/dnd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { KanbanBoard } from '@/components/KanbanBoard'
import { GanttChart } from '@/components/GanttChart'
import { tasksApi, type Task, type KanbanColumn, type GanttTask, TaskStatus } from '@/services/tasks'
import { Plus, Layout, List, BarChart3, Calendar } from 'lucide-react'

export function TasksPage() {
  const [activeTab, setActiveTab] = useState('kanban')
  const [isLoading, setIsLoading] = useState(false)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([])
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([])
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
    overdue: 0,
  })

  // 加载看板数据
  const loadKanbanData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getKanbanBoard()
      if (response.success) {
        setKanbanColumns(response.data)
      }
    } catch (error) {
      toast.error('加载看板数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载甘特图数据
  const loadGanttData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getGanttData()
      if (response.success) {
        setGanttTasks(response.data)
      }
    } catch (error) {
      toast.error('加载甘特图数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const response = await tasksApi.getStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('加载统计失败', error)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadKanbanData()
    loadGanttData()
    loadStats()
  }, [loadKanbanData, loadGanttData, loadStats])

  // 处理拖拽结束
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceStatus = source.droppableId as TaskStatus
    const destStatus = destination.droppableId as TaskStatus

    // 乐观更新
    const newColumns = [...kanbanColumns]
    const sourceCol = newColumns.find(col => col.id === sourceStatus)
    const destCol = newColumns.find(col => col.id === destStatus)

    if (!sourceCol || !destCol) return

    const [movedTask] = sourceCol.tasks.splice(source.index, 1)
    movedTask.status = destStatus
    destCol.tasks.splice(destination.index, 0, movedTask)

    setKanbanColumns(newColumns)

    // 发送请求到后端
    try {
      await tasksApi.updateTaskStatus(draggableId, destStatus, destination.index)
      toast.success('任务状态已更新')
      loadStats()
    } catch (error) {
      toast.error('更新失败，请重试')
      loadKanbanData() // 刷新数据
    }
  }

  // 点击任务
  const handleTaskClick = (task: Task) => {
    // TODO: 打开任务详情侧边栏
    toast.info(`打开任务: ${task.title}`)
  }

  // 添加任务
  const handleAddTask = (status: TaskStatus) => {
    // TODO: 打开新建任务对话框
    toast.info(`在 ${status} 列添加任务`)
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />

      <main className="p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
            <p className="text-gray-500 mt-1">管理个人和团队任务，追踪工作进度</p>
          </div>
          <Button onClick={() => handleAddTask(TaskStatus.TODO)}>
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">总任务</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">待办</div>
            <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">进行中</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">审核中</div>
            <div className="text-2xl font-bold text-purple-600">{stats.review}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">已完成</div>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">已逾期</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </div>
        </div>

        {/* 视图切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="kanban" className="gap-2">
              <Layout className="w-4 h-4" />
              看板视图
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              列表视图
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              甘特图
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              日历
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-[calc(100vh-380px)]">
              <KanbanBoard
                columns={kanbanColumns}
                onDragEnd={handleDragEnd}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              列表视图开发中...
            </div>
          </TabsContent>

          <TabsContent value="gantt" className="mt-4">
            <GanttChart
              tasks={ganttTasks}
              onTaskClick={handleTaskClick}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              日历视图开发中...
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default TasksPage
