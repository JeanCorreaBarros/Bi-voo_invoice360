import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { list, upsert, remove, execution } from './budget.controller.js'

const router = Router()

router.get('/execution', hasPermission('accounting.entry.read'), execution)
router.get('/', hasPermission('accounting.entry.read'), list)
router.post('/', hasPermission('accounting.settings.manage'), upsert)
router.delete('/:id', hasPermission('accounting.settings.manage'), remove)

export default router
