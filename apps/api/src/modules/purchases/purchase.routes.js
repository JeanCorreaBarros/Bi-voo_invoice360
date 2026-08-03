import { Router } from 'express'
import {
  create,
  update,
  confirm,
  cancel,
  list,
  getById,
  exportExcel
} from './purchase.controller.js'

import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.post(
  '/',
  audit({ action: 'CREATE', module: 'PURCHASE' }),
  create
)

router.put(
  '/:id',
  audit({ action: 'UPDATE', module: 'PURCHASE' }),
  update
)

router.patch(
  '/:id/confirm',
  audit({ action: 'CONFIRM', module: 'PURCHASE' }),
  confirm
)

router.patch(
  '/:id/cancel',
  audit({ action: 'CANCEL', module: 'PURCHASE' }),
  cancel
)

router.get('/', list)

router.get('/export/excel', exportExcel)

router.get('/:id', getById)

export default router
