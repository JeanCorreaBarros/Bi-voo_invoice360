import { Router } from 'express'
import * as controller from './scheduledInvoice.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/', audit({ action: 'CREATE', module: 'SCHEDULED_INVOICE' }), controller.create)
router.get('/', controller.list)
router.patch('/:id/cancel', audit({ action: 'UPDATE', module: 'SCHEDULED_INVOICE' }), controller.cancel)

export default router
