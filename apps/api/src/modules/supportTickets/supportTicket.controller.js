import { platformDb, getTenantClient } from '../../lib/db.js'
import { createTicket, listTickets, getTicketById, updateTicket } from './supportTicket.service.js'

function isSuperAdmin(req) {
  return Boolean(req.user?.permissions?.includes('company.manage'))
}

// El JWT solo trae id/companyId/roles/permissions (ver auth.controller.js),
// así que hay que resolver nombre/correo consultando el modelo correcto.
async function resolveRequester(req) {
  if (req.tenantId) {
    const db = await getTenantClient(req.tenantId)
    const user = await db.user.findUnique({ where: { id: req.user.id } })
    return { name: user?.name || user?.email, email: user?.email }
  }
  const platformUser = await platformDb.platformUser.findUnique({ where: { id: req.user.id } })
  return { name: platformUser?.name || platformUser?.email, email: platformUser?.email }
}

export const create = async (req, res) => {
  try {
    const companyId = req.tenantId
    if (!companyId) {
      return res.status(400).json({ ok: false, message: 'Solo usuarios de una empresa pueden crear tickets' })
    }

    const { subject, description, type, priority } = req.body
    if (!subject || !description || !type) {
      return res.status(400).json({ ok: false, message: 'Asunto, tipo y descripción son obligatorios' })
    }

    const requester = await resolveRequester(req)

    const ticket = await createTicket({
      companyId,
      subject,
      description,
      type,
      priority,
      createdByName: requester.name,
      createdByEmail: requester.email
    })

    res.status(201).json({ ok: true, data: ticket })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const superAdmin = isSuperAdmin(req)

    if (!superAdmin && !req.tenantId) {
      return res.status(403).json({ ok: false, message: 'No tienes permiso para ver tickets' })
    }

    const data = await listTickets({ isSuperAdmin: superAdmin, companyId: req.tenantId })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const update = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ ok: false, message: 'Solo un administrador de plataforma puede actualizar tickets' })
    }

    const existing = await getTicketById(req.params.id)
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Ticket no encontrado' })
    }

    const { status, adminReply } = req.body
    const ticket = await updateTicket(req.params.id, { status, adminReply })

    res.json({ ok: true, data: ticket })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
