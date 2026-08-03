import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import * as bankAccountController from './bankAccount.controller.js'
import * as reconciliationController from './bankReconciliation.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/bank-accounts', hasPermission('accounting.entry.read'), bankAccountController.list)
router.post('/bank-accounts', hasPermission('accounting.account.manage'), bankAccountController.create)
router.put('/bank-accounts/:id', hasPermission('accounting.account.manage'), bankAccountController.update)
router.patch('/bank-accounts/:id/deactivate', hasPermission('accounting.account.manage'), bankAccountController.deactivate)
router.patch('/bank-accounts/:id/activate', hasPermission('accounting.account.manage'), bankAccountController.activate)

router.get('/reconciliations', hasPermission('accounting.entry.read'), reconciliationController.list)
router.post('/reconciliations', hasPermission('accounting.entry.manage'), reconciliationController.create)

export default router
