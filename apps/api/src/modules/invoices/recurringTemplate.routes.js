import { Router } from 'express'
import * as controller from './recurringTemplate.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/', audit({ action: 'CREATE', module: 'RECURRING_INVOICE_TEMPLATE' }), controller.create)
router.get('/', controller.list)
router.get('/:id', controller.getById)
router.put('/:id', audit({ action: 'UPDATE', module: 'RECURRING_INVOICE_TEMPLATE' }), controller.update)
router.patch('/:id/deactivate', audit({ action: 'UPDATE', module: 'RECURRING_INVOICE_TEMPLATE' }), controller.deactivate)
router.patch('/:id/activate', audit({ action: 'UPDATE', module: 'RECURRING_INVOICE_TEMPLATE' }), controller.activate)
router.delete('/:id', audit({ action: 'DELETE', module: 'RECURRING_INVOICE_TEMPLATE' }), controller.remove)

export default router
