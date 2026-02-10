import { Router } from 'express'
import {
  equipmentController,
  maintenanceRecordController,
  maintenancePlanController,
  maintenanceTemplateController,
  partController,
  partLifecycleController,
} from '../controllers/equipmentController'
import { authenticate, requireMinRole } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// 所有路由需要认证
router.use(authenticate)

// ============================================
// 设备信息路由
// ============================================

// 设备CRUD - 根路径 /api/equipment
// 注意：具体路由必须在 /:id 通配符路由之前定义
router.post('/', asyncHandler(equipmentController.create))
router.get('/', asyncHandler(equipmentController.findMany))
router.get('/statistics', asyncHandler(equipmentController.getStatistics))
router.get('/categories', asyncHandler(equipmentController.getCategories))
router.get('/locations', asyncHandler(equipmentController.getLocations))

// ============================================
// 维修保养记录路由 - /api/equipment/maintenance
// ============================================
// 必须在 /:id 之前定义，否则会被当成设备ID

router.post('/maintenance', asyncHandler(maintenanceRecordController.create))
router.get('/maintenance', asyncHandler(maintenanceRecordController.findMany))
router.get('/maintenance/statistics', asyncHandler(maintenanceRecordController.getStatistics))
router.get('/maintenance/:id', asyncHandler(maintenanceRecordController.getById))
router.put('/maintenance/:id', asyncHandler(maintenanceRecordController.update))
router.put('/maintenance/:id/complete', asyncHandler(maintenanceRecordController.complete))
router.delete('/maintenance/:id', requireMinRole('MANAGER' as const), asyncHandler(maintenanceRecordController.delete))

// ============================================
// 保养计划路由
// ============================================

router.post('/maintenance-plans', asyncHandler(maintenancePlanController.create))
router.get('/maintenance-plans', asyncHandler(maintenancePlanController.findMany))
router.get('/maintenance-plans/upcoming', asyncHandler(maintenancePlanController.getUpcoming))
router.get('/maintenance-plans/statistics', asyncHandler(maintenancePlanController.getStatistics))
router.get('/maintenance-plans/:id', asyncHandler(maintenancePlanController.getById))
router.put('/maintenance-plans/:id', asyncHandler(maintenancePlanController.update))
router.put('/maintenance-plans/:id/execute', asyncHandler(maintenancePlanController.execute))
router.delete('/maintenance-plans/:id', requireMinRole('MANAGER' as const), asyncHandler(maintenancePlanController.delete))

// ============================================
// 保养模板路由
// ============================================

router.post('/maintenance-templates', asyncHandler(maintenanceTemplateController.create))
router.get('/maintenance-templates', asyncHandler(maintenanceTemplateController.findMany))
router.get('/maintenance-templates/categories', asyncHandler(maintenanceTemplateController.getCategories))
router.get('/maintenance-templates/statistics', asyncHandler(maintenanceTemplateController.getStatistics))
router.get('/maintenance-templates/:id', asyncHandler(maintenanceTemplateController.getById))
router.put('/maintenance-templates/:id', asyncHandler(maintenanceTemplateController.update))
router.delete('/maintenance-templates/:id', requireMinRole('MANAGER' as const), asyncHandler(maintenanceTemplateController.delete))

// ============================================
// 配件路由
// ============================================

// 配件CRUD
router.post('/parts', asyncHandler(partController.create))
router.get('/parts', asyncHandler(partController.findMany))
router.get('/parts/categories', asyncHandler(partController.getCategories))
router.get('/parts/statistics', asyncHandler(partController.getStatistics))
router.get('/parts/:id', asyncHandler(partController.getById))
router.put('/parts/:id', asyncHandler(partController.update))
router.delete('/parts/:id', requireMinRole('MANAGER' as const), asyncHandler(partController.delete))

// 出入库操作
router.post('/parts/stock-in', asyncHandler(partController.stockIn))
router.post('/parts/stock-out', asyncHandler(partController.stockOut))
router.get('/parts/stock/records', asyncHandler(partController.findStockRecords))
router.get('/parts/stock/statistics', asyncHandler(partController.getStockStatistics))

// 配件领用
router.post('/parts/usage', asyncHandler(partController.createUsage))
router.get('/parts/usage/records', asyncHandler(partController.findUsageRecords))
router.get('/parts/usage/statistics', asyncHandler(partController.getUsageStatistics))
router.put('/parts/usage/:id/approve', asyncHandler(partController.approveUsage))

// 配件报废
router.post('/parts/scrap', asyncHandler(partController.createScrap))
router.get('/parts/scrap/records', asyncHandler(partController.findScrapRecords))
router.get('/parts/scrap/statistics', asyncHandler(partController.getScrapStatistics))
router.put('/parts/scrap/:id/approve', asyncHandler(partController.approveScrap))

// ============================================
// 配件生命周期路由
// ============================================

router.post('/part-lifecycle', asyncHandler(partLifecycleController.create))
router.get('/part-lifecycle', asyncHandler(partLifecycleController.findMany))
router.get('/part-lifecycle/statistics', asyncHandler(partLifecycleController.getStatistics))
router.get('/part-lifecycle/:id', asyncHandler(partLifecycleController.getById))
router.get('/part-lifecycle/by-part/:partId', asyncHandler(partLifecycleController.getByPartId))
router.put('/part-lifecycle/:id', asyncHandler(partLifecycleController.update))
router.put('/part-lifecycle/part/:partId/usage', asyncHandler(partLifecycleController.updateUsage))
router.delete('/part-lifecycle/:id', requireMinRole('MANAGER' as const), asyncHandler(partLifecycleController.delete))

// ============================================
// 设备通配符路由 - 必须放在最后
// ============================================
// 这些路由会匹配任何路径，所以必须放在所有具体路由之后
// 否则 /maintenance、/parts 等会被当成设备ID

router.get('/:id', asyncHandler(equipmentController.getById))
router.put('/:id', asyncHandler(equipmentController.update))
router.delete('/:id', requireMinRole('MANAGER' as const), asyncHandler(equipmentController.delete))

export default router
