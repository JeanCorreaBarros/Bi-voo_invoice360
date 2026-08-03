import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { list } from './auditLog.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.audit.read'), list)

export default router
