import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { list, getById, create, update, deactivate, activate } from './account.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.entry.read'), list)
router.get('/:id', hasPermission('accounting.entry.read'), getById)
router.post('/', hasPermission('accounting.account.manage'), create)
router.put('/:id', hasPermission('accounting.account.manage'), update)
router.patch('/:id/deactivate', hasPermission('accounting.account.manage'), deactivate)
router.patch('/:id/activate', hasPermission('accounting.account.manage'), activate)

export default router
