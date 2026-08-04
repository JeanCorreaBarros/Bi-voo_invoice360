import { Router } from 'express'
import * as controller from './invoice.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'
import { runDueRecurringTemplates, runDueScheduledInvoices } from './invoiceScheduler.service.js'

const router = Router()

router.use(auth, requireTenant)

router.post(
  '/',
  audit({ action: 'CREATE', module: 'INVOICE' }),
  controller.create
)

router.post(
  '/bulk',
  audit({ action: 'CREATE', module: 'INVOICE_BULK' }),
  controller.createBulk
)

router.post('/scheduler/run-now', audit({ action: 'CREATE', module: 'INVOICE_SCHEDULER' }), async (req, res) => {
  try {
    const [recurring, scheduled] = await Promise.all([
      runDueRecurringTemplates(req.db),
      runDueScheduledInvoices(req.db)
    ])
    res.json({ ok: true, recurring, scheduled })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
})

router.put(
  '/:id',
  audit({ action: 'UPDATE', module: 'INVOICE' }),
  controller.update
)

router.get('/', controller.list)

router.get('/:id', controller.getById)

router.patch(
  '/:prefix/:number/cancel',
  audit({ action: 'VOID', module: 'INVOICE' }),
  controller.cancel
)

router.get('/:prefix/:number', controller.getByNumber)

export default router
