import { Router } from 'express'
import { login, updateProfile, updatePassword, updateAvatar } from '../controllers/auth.controller.js'
import { auth } from '../middlewares/auth.middleware.js'
import { avatarUpload } from '../middlewares/avatarUpload.js'

const router = Router()

router.post('/login', login)

// Profile routes
router.put('/profile', auth, updateProfile)
router.put('/password', auth, updatePassword)
router.patch('/avatar', auth, avatarUpload.single('avatar'), updateAvatar)

export default router
