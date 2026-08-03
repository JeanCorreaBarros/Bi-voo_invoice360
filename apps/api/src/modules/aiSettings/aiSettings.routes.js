import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { get, update, updateEvents, updateEventPromptsHandler } from './aiSettings.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/ai', hasPermission('accounting.settings.manage'), get)
router.put('/ai', hasPermission('accounting.settings.manage'), update)
router.put('/ai/events', hasPermission('accounting.settings.manage'), updateEvents)
router.put('/ai/event-prompts', hasPermission('accounting.settings.manage'), updateEventPromptsHandler)

export default router
