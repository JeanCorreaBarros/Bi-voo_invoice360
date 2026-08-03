import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'
import { list, create } from './periodClose.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.entry.read'), list)
router.post(
  '/',
  hasPermission('accounting.entry.manage'),
  audit({ action: 'CREATE', module: 'PERIOD_CLOSE' }),
  create
)

export default router
