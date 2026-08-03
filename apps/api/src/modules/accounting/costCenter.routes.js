import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { list, create, update, deactivate, activate } from './costCenter.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.entry.read'), list)
router.post('/', hasPermission('accounting.costcenter.manage'), create)
router.put('/:id', hasPermission('accounting.costcenter.manage'), update)
router.patch('/:id/deactivate', hasPermission('accounting.costcenter.manage'), deactivate)
router.patch('/:id/activate', hasPermission('accounting.costcenter.manage'), activate)

export default router
