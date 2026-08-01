import { Router } from 'express'
import { downloadInvoicePDF,sendInvoiceByEmail  } from './invoice-pdf.controller.js'
import { auth } from '../../middlewares/auth.middleware.js'
import { requireTenant } from '../../middlewares/tenant.middleware.js'

const router = Router()

router.use(auth, requireTenant)

router.get('/:id/pdf', downloadInvoicePDF)

router.post('/:id/email', sendInvoiceByEmail)


export default router
