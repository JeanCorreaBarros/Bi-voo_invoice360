// src/modules/users/user.routes.js
import { Router } from 'express'
import * as userController from './user.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'
import { hasPermission } from '../../middlewares/permission.middleware.js'


const router = Router()

router.use(auth)

router.get(
  '/',
  hasPermission('user.read'),
  userController.listUsers
)

router.post(
  '/',
  hasPermission('user.create'),
  userController.createUser
)

router.put(
  '/:id',
  hasPermission('user.update'),
  userController.updateUser
)

router.patch(
  '/:id/toggle',
  hasPermission('user.toggle'),
  userController.toggleUser
)

router.patch(
  '/:id/password',
  hasPermission('user.change_password'),
  userController.changePassword
)


export default router
