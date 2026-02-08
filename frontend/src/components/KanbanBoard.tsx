// frontend/src/components/KanbanBoard.tsx
import { useCallback } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableStateSnapshot,
} from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import type { Task, KanbanColumn as KanbanColumnType, TaskStatus } from '@/services/tasks'

interface KanbanBoardProps {
  columns: KanbanColumnType[]
  onDragEnd: (result: DropResult) => void
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  isLoading?: boolean
}

const columnConfig: Record<TaskStatus, { title: string; color: string; bg: string }> = {
  TODO: { title: '待办', color: 'text-gray-700', bg: 'bg-gray-50' },
  IN_PROGRESS: { title: '进行中', color: 'text-blue-700', bg: 'bg-blue-50' },
  REVIEW: { title: '审核中', color: 'text-purple-700', bg: 'bg-purple-50' },
  DONE: { title: '已完成', color: 'text-green-700', bg: 'bg-green-50' },
}

export function KanbanBoard({
  columns,
  onDragEnd,
  onTaskClick,
  onAddTask,
  isLoading,
}: KanbanBoardProps) {
  const handleDragStart = useCallback(() => {
    if (typeof window !== 'undefined') {
      document.body.style.cursor = 'grabbing'
    }
  }, [])

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      document.body.style.cursor = 'default'
      onDragEnd(result)
    },
    [onDragEnd]
  )

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((status) => (
          <div key={status} className="flex-1 min-w-[280px] max-w-[400px]">
            <div className="bg-gray-50 rounded-lg p-3 h-full">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-2">
        {columns.map((column) => {
          const config = columnConfig[column.id]
          return (
            <div
              key={column.id}
              className="flex-1 min-w-[280px] max-w-[400px] flex flex-col"
            >
              {/* 列标题 */}
              <div className={`${config.bg} rounded-t-lg px-3 py-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${config.color}`}>{config.title}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {column.tasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddTask(column.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 任务列表 */}
              <Droppable droppableId={column.id}>
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      flex-1 ${config.bg} rounded-b-lg p-2 space-y-2
                      min-h-[200px] transition-colors
                      ${snapshot.isDraggingOver ? 'bg-opacity-80 ring-2 ring-inset ring-blue-300' : ''}
                    `}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(
                          dragProvided: DraggableProvided,
                          dragSnapshot: DraggableStateSnapshot
                        ) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                            }}
                          >
                            <TaskCard
                              task={task}
                              onClick={onTaskClick}
                              isDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* 快速添加按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-gray-500 hover:text-gray-700 hover:bg-white/50 border border-dashed border-gray-300"
                      onClick={() => onAddTask(column.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加任务
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
