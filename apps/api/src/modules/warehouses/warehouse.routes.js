import { Router } from 'express'
import * as controller from './warehouse.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/stock-by-warehouse', controller.stockByWarehouse)

router.get('/transfers', controller.transferList)
router.post('/transfers', audit({ action: 'CREATE', module: 'STOCK_TRANSFER' }), controller.transferCreate)

router.post('/', audit({ action: 'CREATE', module: 'WAREHOUSE' }), controller.create)
router.get('/', controller.list)
router.put('/:id', audit({ action: 'UPDATE', module: 'WAREHOUSE' }), controller.update)
router.patch('/:id/deactivate', audit({ action: 'DEACTIVATE', module: 'WAREHOUSE' }), controller.deactivate)

export default router
