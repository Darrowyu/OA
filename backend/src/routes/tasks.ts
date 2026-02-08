// backend/src/routes/tasks.ts
import { Router } from 'express'
import { taskController } from '../controllers/taskController'
import { auth } from '../middleware/auth'

const router = Router()

// 任务路由
router.post('/', auth, taskController.create.bind(taskController))
router.get('/', auth, taskController.findMany.bind(taskController))
router.get('/stats', auth, taskController.getMyTaskStats.bind(taskController))
router.get('/kanban', auth, taskController.getKanbanBoard.bind(taskController))
router.get('/gantt', auth, taskController.getGanttData.bind(taskController))
router.get('/projects', auth, taskController.getProjects.bind(taskController))
router.post('/projects', auth, taskController.createProject.bind(taskController))
router.put('/projects/:id', auth, taskController.updateProject.bind(taskController))
router.delete('/projects/:id', auth, taskController.deleteProject.bind(taskController))
router.get('/:id', auth, taskController.getById.bind(taskController))
router.put('/:id', auth, taskController.update.bind(taskController))
router.patch('/:id/status', auth, taskController.updateStatus.bind(taskController))
router.post('/reorder', auth, taskController.updateTaskOrders.bind(taskController))
router.delete('/:id', auth, taskController.delete.bind(taskController))

export default router
