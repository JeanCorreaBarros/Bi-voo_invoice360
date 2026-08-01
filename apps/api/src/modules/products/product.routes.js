import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'
import {
  create,
  list,
  getById,
  update,
  activate,
  deactivate,
  move
} from './product.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.post(
  '/',
  audit({ action: 'CREATE', module: 'PRODUCT' }),
  create
)

router.get('/', list)

router.get('/:id', getById)

router.put(
  '/:id',
  audit({ action: 'UPDATE', module: 'PRODUCT' }),
  update
)

router.patch(
  '/:id/activate',
  audit({ action: 'ACTIVATE', module: 'PRODUCT' }),
  activate
)

router.patch(
  '/:id/deactivate',
  audit({ action: 'DEACTIVATE', module: 'PRODUCT' }),
  deactivate
)

router.post(
  '/:id/move',
  audit({ action: 'MOVE_STOCK', module: 'INVENTORY' }),
  move
)

export default router
