import { platformDb } from '../../lib/db.js'

export async function createTicket({ companyId, subject, description, type, priority, createdByName, createdByEmail }) {
  return platformDb.supportTicket.create({
    data: {
      companyId,
      subject,
      description,
      type,
      priority: priority || 'MEDIUM',
      createdByName,
      createdByEmail
    }
  })
}

// SUPER_ADMIN ve los tickets de todas las empresas (con el nombre de cada
// una); un usuario de tenant solo ve los de su propia empresa.
export async function listTickets({ isSuperAdmin, companyId }) {
  const tickets = await platformDb.supportTicket.findMany({
    where: isSuperAdmin ? {} : { companyId },
    include: { company: { select: { businessName: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return tickets.map(t => ({
    id: t.id,
    companyId: t.companyId,
    companyName: t.company?.businessName,
    subject: t.subject,
    description: t.description,
    type: t.type,
    priority: t.priority,
    status: t.status,
    createdByName: t.createdByName,
    createdByEmail: t.createdByEmail,
    adminReply: t.adminReply,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }))
}

export async function getTicketById(id) {
  return platformDb.supportTicket.findUnique({
    where: { id },
    include: { company: { select: { businessName: true } } }
  })
}

export async function updateTicket(id, { status, adminReply }) {
  return platformDb.supportTicket.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(adminReply !== undefined ? { adminReply } : {})
    }
  })
}
