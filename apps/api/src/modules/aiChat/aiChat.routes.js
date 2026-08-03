import { Router } from 'express'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { chat } from './aiChat.controller.js'

const router = Router()

router.use(auth, requireTenant)

router.post('/chat', chat)

export default router
