import { Router } from 'express'
import multer from 'multer'
import {
  equipmentController,
  maintenanceRecordController,
  maintenancePlanController,
  maintenanceTemplateController,
  partController,
  partLifecycleController,
  sparePartCategoryController,
} from '../controllers/equipmentController'
import { factoryController } from '../controllers/factoryController'
import { equipmentHealthController } from '../controllers/equipmentHealthController'
import { partInventoryController } from '../controllers/partInventoryController'
import { capacityController } from '../controllers/capacityController'
import { authenticate, requireMinRole } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const upload = multer({ storage: multer.memoryStorage() })
const router = Router()
const requireManager = () => requireMinRole('MANAGER' as const)

router.use(authenticate)

// ============================================
// 厂区管理路由
// ============================================

router.post('/factories', requireManager(), asyncHandler(factoryController.create))
router.get('/factories', asyncHandler(factoryController.findMany))
router.get('/factories/all', asyncHandler(factoryController.getAll))
router.get('/factories/statistics', asyncHandler(factoryController.getStatistics))
router.get('/factories/:id', asyncHandler(factoryController.getById))
router.put('/factories/:id', requireManager(), asyncHandler(factoryController.update))
router.delete('/factories/:id', requireManager(), asyncHandler(factoryController.delete))

// ============================================
// 设备信息路由
// ============================================

// 设备CRUD - 根路径 /api/equipment
// 注意：具体路由必须在 /:id 通配符路由之前定义
router.post('/', requireManager(), asyncHandler(equipmentController.create))
router.get('/', asyncHandler(equipmentController.findMany))
router.get('/statistics', asyncHandler(equipmentController.getStatistics))
router.get('/categories', asyncHandler(equipmentController.getCategories))
router.get('/locations', asyncHandler(equipmentController.getLocations))

// 批量操作和导入导出
router.post('/batch-delete', requireManager(), asyncHandler(equipmentController.batchDelete))
router.get('/export', asyncHandler(equipmentController.exportExcel))
router.post('/import', requireManager(), upload.single('file'), asyncHandler(equipmentController.importExcel))
router.get('/filter-options', asyncHandler(equipmentController.getFilterOptions))

// ============================================
// 设备健康度路由
// ============================================

router.get('/:id/health', asyncHandler(equipmentHealthController.getCurrentHealth))
router.post('/:id/health/calculate', asyncHandler(equipmentHealthController.calculate))
router.get('/:id/health/history', asyncHandler(equipmentHealthController.getHistory))
router.get('/:id/health/prediction', asyncHandler(equipmentHealthController.getPrediction))
router.get('/:id/health/trend-alerts', asyncHandler(equipmentHealthController.getTrendAlerts))
router.post('/health/batch-calculate', requireManager(), asyncHandler(equipmentHealthController.batchCalculate))
router.get('/health/statistics', asyncHandler(equipmentHealthController.getStatistics))
router.get('/health/cache-stats', asyncHandler(equipmentHealthController.getCacheStats))
router.post('/health/clear-cache', requireManager(), asyncHandler(equipmentHealthController.clearCache))

// ============================================
// 维修保养记录路由 - /api/equipment/maintenance
// ============================================
// 必须在 /:id 之前定义，否则会被当成设备ID

router.post('/maintenance', requireManager(), asyncHandler(maintenanceRecordController.create))
router.get('/maintenance', asyncHandler(maintenanceRecordController.findMany))
router.get('/maintenance/export', asyncHandler(maintenanceRecordController.exportExcel))
router.get('/maintenance/options', asyncHandler(maintenanceRecordController.getOptions))
router.get('/maintenance/statistics', asyncHandler(maintenanceRecordController.getStatistics))
router.post('/maintenance/import', requireManager(), upload.single('file'), asyncHandler(maintenanceRecordController.importExcel))
router.get('/maintenance/:maintenanceId/parts', asyncHandler(maintenanceRecordController.getMaintenanceParts))
router.post('/maintenance/:maintenanceId/parts', requireManager(), asyncHandler(maintenanceRecordController.addMaintenancePart))
router.delete('/maintenance/:maintenanceId/parts/:partId', requireManager(), asyncHandler(maintenanceRecordController.removeMaintenancePart))
router.get('/maintenance/:maintenanceId/cost', asyncHandler(maintenanceRecordController.getMaintenanceCost))
router.get('/maintenance/:id', asyncHandler(maintenanceRecordController.getById))
router.put('/maintenance/:id', requireManager(), asyncHandler(maintenanceRecordController.update))
router.put('/maintenance/:id/complete', requireManager(), asyncHandler(maintenanceRecordController.complete))
router.delete('/maintenance/:id', requireManager(), asyncHandler(maintenanceRecordController.delete))

// ============================================
// 保养计划路由
// ============================================

router.post('/maintenance-plans', requireManager(), asyncHandler(maintenancePlanController.create))
router.get('/maintenance-plans', asyncHandler(maintenancePlanController.findMany))
router.get('/maintenance-plans/options', asyncHandler(maintenancePlanController.getOptions))
router.get('/maintenance-plans/upcoming', asyncHandler(maintenancePlanController.getUpcoming))
router.get('/maintenance-plans/statistics', asyncHandler(maintenancePlanController.getStatistics))
router.get('/maintenance-plans/calendar', asyncHandler(maintenancePlanController.getCalendar))
router.get('/maintenance-plans/reminders', asyncHandler(maintenancePlanController.checkReminders))
router.put('/maintenance-plans/reminders/:id/read', asyncHandler(maintenancePlanController.markReminderRead))
router.get('/maintenance-plans/:id', asyncHandler(maintenancePlanController.getById))
router.put('/maintenance-plans/:id', requireManager(), asyncHandler(maintenancePlanController.update))
router.put('/maintenance-plans/:id/execute', requireManager(), asyncHandler(maintenancePlanController.execute))
router.delete('/maintenance-plans/:id', requireManager(), asyncHandler(maintenancePlanController.delete))

// ============================================
// 保养模板路由
// ============================================

router.post('/maintenance-templates', requireManager(), asyncHandler(maintenanceTemplateController.create))
router.get('/maintenance-templates', asyncHandler(maintenanceTemplateController.findMany))
router.get('/maintenance-templates/categories', asyncHandler(maintenanceTemplateController.getCategories))
router.get('/maintenance-templates/equipment-types', asyncHandler(maintenanceTemplateController.getEquipmentTypes))
router.get('/maintenance-templates/statistics', asyncHandler(maintenanceTemplateController.getStatistics))
router.get('/maintenance-templates/:id', asyncHandler(maintenanceTemplateController.getById))
router.put('/maintenance-templates/:id', requireManager(), asyncHandler(maintenanceTemplateController.update))
router.delete('/maintenance-templates/:id', requireManager(), asyncHandler(maintenanceTemplateController.delete))

// ============================================
// 配件路由
// ============================================

// 配件分类管理
router.get('/parts/categories', asyncHandler(sparePartCategoryController.getAll))
router.get('/parts/categories/tree', asyncHandler(sparePartCategoryController.getTree))
router.post('/parts/categories', requireManager(), asyncHandler(sparePartCategoryController.create))
router.put('/parts/categories/:id', requireManager(), asyncHandler(sparePartCategoryController.update))
router.delete('/parts/categories/:id', requireManager(), asyncHandler(sparePartCategoryController.delete))

// 配件CRUD
router.post('/parts', requireManager(), asyncHandler(partController.create))
router.get('/parts', asyncHandler(partController.findMany))
router.get('/parts/options', asyncHandler(partController.getOptions))
router.get('/parts/statistics', asyncHandler(partController.getStatistics))
router.get('/parts/stock-alerts', asyncHandler(partController.getStockAlerts))
router.get('/parts/requisition', asyncHandler(partController.generateRequisition))
router.get('/parts/inventory-logs', asyncHandler(partController.getInventoryLogs))
router.get('/parts/:id', asyncHandler(partController.getById))
router.put('/parts/:id', requireManager(), asyncHandler(partController.update))
router.delete('/parts/:id', requireManager(), asyncHandler(partController.delete))

// 出入库操作
router.post('/parts/stock-in', requireManager(), asyncHandler(partController.stockIn))
router.post('/parts/stock-out', requireManager(), asyncHandler(partController.stockOut))
router.get('/parts/stock/records', asyncHandler(partController.findStockRecords))
router.get('/parts/stock/statistics', asyncHandler(partController.getStockStatistics))

// 配件领用
router.post('/parts/usage', requireManager(), asyncHandler(partController.createUsage))
router.get('/parts/usage/records', asyncHandler(partController.findUsageRecords))
router.get('/parts/usage/statistics', asyncHandler(partController.getUsageStatistics))
router.put('/parts/usage/:id/approve', requireManager(), asyncHandler(partController.approveUsage))

// 配件报废
router.post('/parts/scrap', requireManager(), asyncHandler(partController.createScrap))
router.get('/parts/scrap/records', asyncHandler(partController.findScrapRecords))
router.get('/parts/scrap/statistics', asyncHandler(partController.getScrapStatistics))
router.put('/parts/scrap/:id/approve', requireManager(), asyncHandler(partController.approveScrap))

// 配件丰富统计
router.get('/parts/top-used', asyncHandler(partInventoryController.getTopUsed))
router.get('/parts/monthly-statistics', asyncHandler(partInventoryController.getMonthlyStatistics))
router.get('/parts/by-category-statistics', asyncHandler(partInventoryController.getByCategoryStatistics))
router.get('/parts/by-equipment-statistics', asyncHandler(partInventoryController.getByEquipmentStatistics))
router.get('/parts/full-statistics', asyncHandler(partInventoryController.getFullStatistics))
router.get('/parts/low-stock', asyncHandler(partInventoryController.getLowStock))

// 单配件库存操作和日志
router.post('/parts/:id/stock', requireManager(), asyncHandler(partInventoryController.adjustPartStock))
router.post('/parts/batch-stock', requireManager(), asyncHandler(partInventoryController.batchAdjustStock))
router.get('/parts/:id/inventory-logs', asyncHandler(partInventoryController.getPartInventoryLogs))
router.get('/parts/:id/usage-statistics', asyncHandler(partInventoryController.getPartUsageStatistics))
router.get('/parts/inventory-logs/export', asyncHandler(partInventoryController.exportInventoryLogs))

// ============================================
// 产能管理路由
// ============================================

// 设备产能配置
router.post('/capacity/equipment', requireManager(), asyncHandler(capacityController.createCapability))
router.get('/capacity/equipment', asyncHandler(capacityController.getCapabilities))
router.get('/capacity/equipment/:id', asyncHandler(capacityController.getCapabilityById))
router.put('/capacity/equipment/:id', requireManager(), asyncHandler(capacityController.updateCapability))
router.delete('/capacity/equipment/:id', requireManager(), asyncHandler(capacityController.deleteCapability))

// 操作员技能
router.post('/capacity/operators', requireManager(), asyncHandler(capacityController.createOperatorSkill))
router.get('/capacity/operators', asyncHandler(capacityController.getOperatorSkills))
router.put('/capacity/operators/:id', requireManager(), asyncHandler(capacityController.updateOperatorSkill))
router.delete('/capacity/operators/:id', requireManager(), asyncHandler(capacityController.deleteOperatorSkill))

// 产能查询与分析
router.get('/capacity/products/:productName/available-equipment', asyncHandler(capacityController.getAvailableEquipment))
router.post('/capacity/calculate-requirements', asyncHandler(capacityController.calculateRequirements))
router.get('/capacity/equipment-utilization', asyncHandler(capacityController.getEquipmentUtilization))
router.get('/capacity/operator-efficiency', asyncHandler(capacityController.getOperatorEfficiency))
router.get('/capacity/analysis-report', asyncHandler(capacityController.getAnalysisReport))
router.post('/capacity/equipment/batch-import', requireManager(), asyncHandler(capacityController.batchImport))
router.get('/capacity/export', asyncHandler(capacityController.exportData))

// ============================================
// 配件生命周期路由
// ============================================

router.post('/part-lifecycle', requireManager(), asyncHandler(partLifecycleController.create))
router.get('/part-lifecycle', asyncHandler(partLifecycleController.findMany))
router.get('/part-lifecycle/statistics', asyncHandler(partLifecycleController.getStatistics))
router.get('/part-lifecycle/expiring', asyncHandler(partInventoryController.getExpiringLifecycles))
router.get('/part-lifecycle/expired', asyncHandler(partInventoryController.getExpiredLifecycles))
router.get('/part-lifecycle/active', asyncHandler(partInventoryController.getActiveLifecycles))
router.get('/part-lifecycle/abnormal', asyncHandler(partInventoryController.getAbnormalLifecycles))
router.get('/part-lifecycle/dashboard', asyncHandler(partInventoryController.getLifecycleDashboard))
router.post('/part-lifecycle/refresh', requireManager(), asyncHandler(partInventoryController.refreshLifecycleStatuses))
router.put('/part-lifecycle/:id/abnormal', requireManager(), asyncHandler(partInventoryController.markAbnormal))
router.put('/part-lifecycle/:id/expired', requireManager(), asyncHandler(partInventoryController.markExpired))
router.post('/part-lifecycle/:id/replace', requireManager(), asyncHandler(partInventoryController.replaceLifecycle))
router.get('/part-lifecycle/:id', asyncHandler(partLifecycleController.getById))
router.get('/part-lifecycle/by-part/:partId', asyncHandler(partLifecycleController.getByPartId))
router.put('/part-lifecycle/:id', requireManager(), asyncHandler(partLifecycleController.update))
router.put('/part-lifecycle/part/:partId/usage', requireManager(), asyncHandler(partLifecycleController.updateUsage))
router.delete('/part-lifecycle/:id', requireManager(), asyncHandler(partLifecycleController.delete))

// 设备适用配件列表
router.get('/:id/spare-parts', asyncHandler(partInventoryController.getEquipmentSpareParts))

// ============================================
// 设备通配符路由 - 必须放在最后
// ============================================
// 这些路由会匹配任何路径，所以必须放在所有具体路由之后
// 否则 /maintenance、/parts 等会被当成设备ID

router.get('/:id', asyncHandler(equipmentController.getById))
router.put('/:id', requireManager(), asyncHandler(equipmentController.update))
router.delete('/:id', requireManager(), asyncHandler(equipmentController.delete))

export default router
