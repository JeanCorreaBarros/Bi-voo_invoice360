import { Router } from 'express'
import { login, updateProfile, updatePassword } from '../controllers/auth.controller.js'
import { auth } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/login', login)

// Profile routes
router.put('/profile', auth, updateProfile)
router.put('/password', auth, updatePassword)

export default router
