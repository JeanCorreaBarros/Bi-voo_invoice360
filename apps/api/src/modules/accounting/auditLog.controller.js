import { listAuditLogs } from './auditLog.service.js'

export async function list(req, res) {
  try {
    const { page, limit, module, action } = req.query
    const result = await listAuditLogs(req.db, { page, limit, module, action })
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
