import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import * as controller from './fixedAsset.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/', hasPermission('accounting.entry.read'), controller.list)
router.post('/', hasPermission('accounting.account.manage'), controller.create)
router.put('/:id', hasPermission('accounting.account.manage'), controller.update)
router.patch('/:id/deactivate', hasPermission('accounting.account.manage'), controller.deactivate)
router.post('/:id/depreciate', hasPermission('accounting.entry.manage'), controller.depreciate)

export default router
