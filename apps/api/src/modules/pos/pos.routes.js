import { Router } from 'express'
import * as controller from './pos.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/products', hasPermission('pos.sell'), controller.searchProducts)

router.get('/company-info', hasPermission('pos.sell'), controller.getCompanyInfo)

router.get('/settings', hasPermission('pos.manage'), controller.getSettings)
router.put('/settings', hasPermission('pos.manage'), controller.updateSettings)

router.get('/shifts/current', hasPermission('pos.sell'), controller.getCurrentSession)
router.post('/shifts/open', hasPermission('pos.sell'), audit({ action: 'CREATE', module: 'POS_SHIFT' }), controller.openSession)
router.post('/shifts/:id/close', hasPermission('pos.sell'), audit({ action: 'UPDATE', module: 'POS_SHIFT' }), controller.closeSession)
router.post('/shifts/:id/movements', hasPermission('pos.sell'), audit({ action: 'CREATE', module: 'POS_CASH_MOVEMENT' }), controller.addCashMovement)

router.post('/sales', hasPermission('pos.sell'), audit({ action: 'CREATE', module: 'POS_SALE' }), controller.createSale)

export default router
