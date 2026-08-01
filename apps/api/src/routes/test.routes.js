import { Router } from 'express'
import { auth } from '../middlewares/auth.middleware.js'
import { requireTenant } from '../middlewares/tenant.middleware.js'
import { audit } from '../middlewares/audit.middleware.js'

const router = Router()

router.post(
  '/test-audit',
  auth,
  audit({ action: 'TEST_ACTION', module: 'SYSTEM' }),
  async (req, res) => {
    res.json({
      entity: { id: 'test-123', message: 'Auditoría funcionando' }
    })
  }
)

// Debug endpoint para ver datos de invoices (ahora requiere auth + tenant)
router.get('/debug/invoices', auth, requireTenant, async (req, res) => {
  try {
    const total = await req.db.invoice.count()
    const statuses = await req.db.invoice.groupBy({
      by: ['status'],
      _count: true
    })
    const sample = await req.db.invoice.findMany({
      take: 5,
      select: {
        id: true,
        status: true,
        orderDate: true,
        dueDate: true,
        paidAt: true,
        orderTotalAmountDue: true,
        orderTotalAfterTax: true
      }
    })

    res.json({
      ok: true,
      total,
      statuses,
      sample,
      now: new Date(),
      monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      monthEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    })
  } catch (error) {
    res.json({ ok: false, error: error.message })
  }
})

export default router
