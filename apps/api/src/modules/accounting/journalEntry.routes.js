import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import { audit } from '../../middlewares/audit.middleware.js'
import { list, getById, create, voidEntry } from './journalEntry.controller.js'

const router = Router()

router.get('/', hasPermission('accounting.entry.read'), list)
router.get('/:id', hasPermission('accounting.entry.read'), getById)
router.post(
  '/',
  hasPermission('accounting.entry.manage'),
  audit({ action: 'CREATE', module: 'JOURNAL_ENTRY' }),
  create
)
router.patch(
  '/:id/void',
  hasPermission('accounting.entry.manage'),
  audit({ action: 'VOID', module: 'JOURNAL_ENTRY' }),
  voidEntry
)

export default router
