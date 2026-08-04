import { Router } from 'express'
import * as controller from './creditNote.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/', audit({ action: 'CREATE', module: 'CREDIT_NOTE' }), controller.create)
router.get('/', controller.list)
router.get('/:id', controller.getById)

export default router
