// backend/src/routes/tasks.ts
import { Router } from 'express'
import { taskController } from '../controllers/taskController'
import { auth, requireRole } from '../middleware/auth'
import { UserRole } from '@prisma/client'

const router = Router()

// 允许创建/删除任务的角色
const TASK_MANAGE_ROLES = [UserRole.ADMIN, UserRole.FACTORY_MANAGER]

// 任务路由 - 列表和查看所有认证用户都可以访问
router.get('/', auth, taskController.findMany.bind(taskController))
router.get('/stats', auth, taskController.getMyTaskStats.bind(taskController))
router.get('/kanban', auth, taskController.getKanbanBoard.bind(taskController))
router.get('/gantt', auth, taskController.getGanttData.bind(taskController))
router.get('/projects', auth, taskController.getProjects.bind(taskController))
router.get('/:id', auth, taskController.getById.bind(taskController))

// 创建任务 - 需要特定角色
router.post('/', auth, requireRole(...TASK_MANAGE_ROLES), taskController.create.bind(taskController))

// 更新任务 - 所有认证用户都可以更新（控制器会检查具体权限）
router.put('/:id', auth, taskController.update.bind(taskController))
router.patch('/:id/status', auth, taskController.updateStatus.bind(taskController))
router.post('/reorder', auth, taskController.updateTaskOrders.bind(taskController))

// 删除任务 - 需要特定角色
router.delete('/:id', auth, requireRole(...TASK_MANAGE_ROLES), taskController.delete.bind(taskController))

// 项目管理路由
router.post('/projects', auth, requireRole(...TASK_MANAGE_ROLES), taskController.createProject.bind(taskController))
router.put('/projects/:id', auth, taskController.updateProject.bind(taskController))
router.delete('/projects/:id', auth, requireRole(...TASK_MANAGE_ROLES), taskController.deleteProject.bind(taskController))

export default router
