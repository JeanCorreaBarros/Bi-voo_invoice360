import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import * as controller from './purchasePayment.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/', hasPermission('accounting.entry.manage'), controller.create)
router.get('/:purchaseId', hasPermission('accounting.entry.read'), controller.list)
router.get('/:purchaseId/balance', hasPermission('accounting.entry.read'), controller.balance)

export default router
