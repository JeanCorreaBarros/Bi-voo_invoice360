import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import * as bankAccountController from './bankAccount.controller.js'
import * as reconciliationController from './bankReconciliation.controller.js'
import { matchStatementLines } from './statementImport.service.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/bank-accounts', hasPermission('accounting.entry.read'), bankAccountController.list)
router.post('/bank-accounts', hasPermission('accounting.account.manage'), bankAccountController.create)
router.put('/bank-accounts/:id', hasPermission('accounting.account.manage'), bankAccountController.update)
router.patch('/bank-accounts/:id/deactivate', hasPermission('accounting.account.manage'), bankAccountController.deactivate)
router.patch('/bank-accounts/:id/activate', hasPermission('accounting.account.manage'), bankAccountController.activate)

router.get('/reconciliations', hasPermission('accounting.entry.read'), reconciliationController.list)
router.post('/reconciliations', hasPermission('accounting.entry.manage'), reconciliationController.create)

router.post('/statement-import', hasPermission('accounting.entry.read'), async (req, res) => {
  try {
    const { bankAccountId, lines } = req.body
    if (!bankAccountId) return res.status(400).json({ ok: false, message: 'bankAccountId es obligatorio' })
    const result = await matchStatementLines(req.db, { bankAccountId, lines })
    res.json({ ok: true, data: result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
})

export default router
