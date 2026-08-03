import { Router } from 'express'
import * as controller from './supportTicket.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'

const router = Router()

// Sin requireTenant: los SUPER_ADMIN (sin empresa) también deben poder
// listar/actualizar tickets de todas las empresas.
router.use(auth)

router.post('/', controller.create)
router.get('/', controller.list)
router.patch('/:id', controller.update)

export default router
