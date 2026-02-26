import { ChevronRight, Building2, MoreHorizontal, Edit, Trash2, Users, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Department } from '@/services/departments';

// 部门树节点接口
export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[];
}

interface DepartmentTreeProps {
  departments: DepartmentTreeNode[];
  expandedIds: Set<string>;
  searchQuery: string;
  matchedIds?: Set<string>; // 匹配搜索的部门ID，用于高亮
  onToggle: (id: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onViewMembers: (dept: Department) => void;
  onReorder?: (deptId: string, newParentId: string | null, newIndex: number) => void; // 拖拽排序回调
  enableDrag?: boolean; // 是否启用拖拽
}

// 部门节点渲染组件
interface DepartmentNodeProps {
  dept: DepartmentTreeNode;
  level: number;
  expandedIds: Set<string>;
  matchedIds?: Set<string>;
  searchQuery: string;
  onToggle: (id: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onViewMembers: (dept: Department) => void;
}

function DepartmentNode({
  dept,
  level,
  expandedIds,
  matchedIds,
  searchQuery,
  onToggle,
  onEdit,
  onDelete,
  onViewMembers,
}: DepartmentNodeProps) {
  const hasChildren = dept.children && dept.children.length > 0;
  const isExpanded = expandedIds.has(dept.id);
  const isMatch = matchedIds ? matchedIds.has(dept.id) : (searchQuery && dept.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-gray-50',
          isMatch && 'bg-yellow-50'
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <span className="w-5 flex-shrink-0" />

        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(dept.id)}
            className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
          >
            <ChevronRight
              className={cn('h-4 w-4 text-gray-500 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium truncate",
              isMatch ? 'text-yellow-800' : 'text-gray-900'
            )}>
              {dept.name}
            </span>
            {dept.manager && (
              <span className="text-xs text-gray-500">
                负责人: {dept.manager.name}
              </span>
            )}
          </div>
          {dept.description && (
            <p className="text-xs text-gray-400 truncate">{dept.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(dept)}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewMembers(dept)}>
              <Users className="h-4 w-4 mr-2" />
              查看成员
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(dept)}
              className="text-red-600 focus:text-red-600"
              disabled={dept.children && dept.children.length > 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {dept.children!.map((child) => (
            <DepartmentNode
              key={child.id}
              dept={child}
              level={level + 1}
              expandedIds={expandedIds}
              matchedIds={matchedIds}
              searchQuery={searchQuery}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewMembers={onViewMembers}
            />
          ))}
        </div>
      )}
    </>
  );
}

// 可拖拽部门节点
interface DraggableDepartmentNodeProps extends DepartmentNodeProps {
  index: number;
  onReorder?: (deptId: string, newParentId: string | null, newIndex: number) => void;
}

function DraggableDepartmentNode({
  dept,
  index,
  level,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onViewMembers,
}: DraggableDepartmentNodeProps) {
  const hasChildren = dept.children && dept.children.length > 0;
  const isExpanded = expandedIds.has(dept.id);

  return (
    <Draggable draggableId={dept.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'rounded-lg',
            snapshot.isDragging && 'shadow-lg bg-blue-50'
          )}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group"
            style={{ paddingLeft: `${level * 24 + 12}px` }}
          >
            <div
              {...provided.dragHandleProps}
              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>

            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(dept.id)}
                className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
              >
                <ChevronRight
                  className={cn('h-4 w-4 text-gray-500 transition-transform', isExpanded && 'rotate-90')}
                />
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}

            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {dept.name}
                </span>
                {dept.manager && (
                  <span className="text-xs text-gray-500">
                    负责人: {dept.manager.name}
                  </span>
                )}
              </div>
              {dept.description && (
                <p className="text-xs text-gray-400 truncate">{dept.description}</p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(dept)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewMembers(dept)}>
                  <Users className="h-4 w-4 mr-2" />
                  查看成员
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(dept)}
                  className="text-red-600 focus:text-red-600"
                  disabled={dept.children && dept.children.length > 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 子部门 */}
          {hasChildren && isExpanded && (
            <Droppable droppableId={`children-${dept.id}`} type={`level-${level + 1}`}>
              {(dropProvided) => (
                <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                  {dept.children!.map((child, childIndex) => (
                    <Draggable
                      key={child.id}
                      draggableId={child.id}
                      index={childIndex}
                    >
                      {(childDragProvided, childSnapshot) => (
                        <div
                          ref={childDragProvided.innerRef}
                          {...childDragProvided.draggableProps}
                          className={cn(
                            'rounded-lg',
                            childSnapshot.isDragging && 'shadow-lg bg-blue-50'
                          )}
                        >
                          <div
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group"
                            style={{ paddingLeft: `${(level + 1) * 24 + 12}px` }}
                          >
                            <div
                              {...childDragProvided.dragHandleProps}
                              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>

                            {child.children && child.children.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => onToggle(child.id)}
                                className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
                              >
                                <ChevronRight
                                  className={cn('h-4 w-4 text-gray-500 transition-transform', expandedIds.has(child.id) && 'rotate-90')}
                                />
                              </button>
                            ) : (
                              <span className="w-5 flex-shrink-0" />
                            )}

                            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {child.name}
                                </span>
                                {child.manager && (
                                  <span className="text-xs text-gray-500">
                                    负责人: {child.manager.name}
                                  </span>
                                )}
                              </div>
                              {child.description && (
                                <p className="text-xs text-gray-400 truncate">{child.description}</p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(child)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onViewMembers(child)}>
                                  <Users className="h-4 w-4 mr-2" />
                                  查看成员
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(child)}
                                  className="text-red-600 focus:text-red-600"
                                  disabled={child.children && child.children.length > 0}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      )}
    </Draggable>
  );
}

// 部门树组件
export function DepartmentTree({
  departments,
  expandedIds,
  searchQuery,
  matchedIds,
  onToggle,
  onEdit,
  onDelete,
  onViewMembers,
  onReorder,
  enableDrag = false,
}: DepartmentTreeProps) {
  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Building2 className="h-12 w-12 mb-4 text-gray-300" />
        <p>暂无部门数据</p>
        <p className="text-sm text-gray-400 mt-1">点击上方按钮创建第一个部门</p>
      </div>
    );
  }

  // 搜索模式下禁用拖拽
  const canDrag = enableDrag && !searchQuery;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;

    const sourceId = result.draggableId;
    const destDroppableId = result.destination.droppableId;

    // 解析目标父部门ID
    let newParentId: string | null = null;
    if (destDroppableId.startsWith('children-')) {
      newParentId = destDroppableId.replace('children-', '');
    }

    onReorder(sourceId, newParentId, result.destination.index);
  };

  // 简单渲染模式（无拖拽）
  if (!canDrag) {
    return (
      <div className="p-2">
        {departments.map((dept) => (
          <DepartmentNode
            key={dept.id}
            dept={dept}
            level={0}
            expandedIds={expandedIds}
            matchedIds={matchedIds}
            searchQuery={searchQuery}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewMembers={onViewMembers}
          />
        ))}
      </div>
    );
  }

  // 拖拽模式
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="root" type="level-0">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="p-2">
            {departments.map((dept, index) => (
              <DraggableDepartmentNode
                key={dept.id}
                dept={dept}
                index={index}
                level={0}
                expandedIds={expandedIds}
                matchedIds={matchedIds}
                searchQuery={searchQuery}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewMembers={onViewMembers}
                onReorder={onReorder}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
