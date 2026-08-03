import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { get, update } from './accountingSettings.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.settings.manage'), get)
router.put('/', hasPermission('accounting.settings.manage'), update)

export default router
