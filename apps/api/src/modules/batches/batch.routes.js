import { Router } from 'express'
import * as controller from './batch.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/alerts', controller.alerts)

router.post('/', audit({ action: 'CREATE', module: 'BATCH' }), controller.create)
router.get('/', controller.list)
router.patch('/:id', audit({ action: 'ADJUST', module: 'BATCH' }), controller.adjust)

export default router
