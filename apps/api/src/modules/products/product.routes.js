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
  move,
  getComponents,
  setComponents,
  getAllKits,
  getVariants,
  addVariant
} from './product.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.post(
  '/',
  audit({ action: 'CREATE', module: 'PRODUCT' }),
  create
)

router.get('/', list)

router.get('/kits', getAllKits)

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

router.get('/:id/components', getComponents)
router.put(
  '/:id/components',
  audit({ action: 'UPDATE', module: 'KIT' }),
  setComponents
)

router.get('/:id/variants', getVariants)
router.post(
  '/:id/variants',
  audit({ action: 'CREATE', module: 'PRODUCT_VARIANT' }),
  addVariant
)

export default router
