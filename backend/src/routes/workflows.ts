import { Router } from 'express'
import * as workflowController from '../controllers/workflowController'
import { auth } from '../middleware/auth'
import { requireAdmin } from '../middleware/auth'

const router = Router()

// 应用认证中间件
router.use(auth)

// 工作流定义管理路由 - 仅管理员可操作
router.get('/', workflowController.getWorkflows)
router.get('/:id', workflowController.getWorkflowById)
router.post('/', requireAdmin, workflowController.createWorkflow)
router.put('/:id', requireAdmin, workflowController.updateWorkflow)
router.delete('/:id', requireAdmin, workflowController.deleteWorkflow)
router.post('/:id/publish', requireAdmin, workflowController.publishWorkflow)
router.post('/:id/default', requireAdmin, workflowController.setDefaultWorkflow)
router.post('/:id/simulate', requireAdmin, workflowController.simulateWorkflow)

// 工作流实例路由
router.post('/instances/start', workflowController.startWorkflow)
router.get('/instances/:id', workflowController.getWorkflowInstance)
router.post('/instances/:id/process', workflowController.processNode)
router.get('/instances/entity/:entityType/:entityId', workflowController.getEntityInstances)

export default router
