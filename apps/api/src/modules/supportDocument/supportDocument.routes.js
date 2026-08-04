import { Router } from 'express'
import * as controller from './supportDocument.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/', audit({ action: 'CREATE', module: 'SUPPORT_DOCUMENT' }), controller.create)
router.get('/', controller.list)
router.get('/:id', controller.getById)
router.patch('/:id/cancel', audit({ action: 'CANCEL', module: 'SUPPORT_DOCUMENT' }), controller.cancel)

export default router
