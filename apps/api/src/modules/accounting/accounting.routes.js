import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import accountRoutes from './account.routes.js'
import costCenterRoutes from './costCenter.routes.js'
import journalEntryRoutes from './journalEntry.routes.js'
import reportRoutes from './report.routes.js'
import accountingSettingsRoutes from './accountingSettings.routes.js'
import periodCloseRoutes from './periodClose.routes.js'
import taxRateRoutes from './taxRate.routes.js'
import budgetRoutes from './budget.routes.js'
import auditLogRoutes from './auditLog.routes.js'

const router = Router()

router.use(auth, requireTenant)

router.use('/accounts', accountRoutes)
router.use('/cost-centers', costCenterRoutes)
router.use('/entries', journalEntryRoutes)
router.use('/reports', reportRoutes)
router.use('/settings', accountingSettingsRoutes)
router.use('/period-closes', periodCloseRoutes)
router.use('/tax-rates', taxRateRoutes)
router.use('/budgets', budgetRoutes)
router.use('/audit-logs', auditLogRoutes)

export default router
