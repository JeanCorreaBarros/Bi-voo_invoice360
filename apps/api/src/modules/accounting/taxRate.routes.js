import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { list, create, update, deactivate, activate } from './taxRate.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.entry.read'), list)
router.post('/', hasPermission('accounting.settings.manage'), create)
router.put('/:id', hasPermission('accounting.settings.manage'), update)
router.patch('/:id/deactivate', hasPermission('accounting.settings.manage'), deactivate)
router.patch('/:id/activate', hasPermission('accounting.settings.manage'), activate)

export default router
