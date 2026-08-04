export async function createScheduledInvoice(db, data) {
  const { items, ...rest } = data
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La factura programada debe tener al menos un ítem')
  }
  if (!data.scheduledFor) {
    throw new Error('scheduledFor es obligatorio')
  }
  return db.scheduledInvoice.create({
    data: { ...rest, items, scheduledFor: new Date(data.scheduledFor) }
  })
}

export async function listScheduledInvoices(db) {
  return db.scheduledInvoice.findMany({
    orderBy: { scheduledFor: 'asc' },
    include: { user: { select: { id: true, name: true } }, invoice: { select: { id: true, orderPrefix: true, orderId: true } } }
  })
}

export async function cancelScheduledInvoice(db, id) {
  const existing = await db.scheduledInvoice.findUnique({ where: { id } })
  if (!existing) throw new Error('Factura programada no encontrada')
  if (existing.status !== 'PENDING') throw new Error('Solo se pueden cancelar facturas programadas pendientes')
  return db.scheduledInvoice.update({ where: { id }, data: { status: 'CANCELLED' } })
}
