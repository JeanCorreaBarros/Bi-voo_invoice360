const FREQUENCY_DAYS = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  BIMONTHLY: 60
}

// Avanza `from` al siguiente vencimiento según la frecuencia. MONTHLY/YEARLY
// usan meses/años calendario (para que caiga siempre el mismo día del mes,
// ej. el 5 de cada mes); las demás son de días fijos.
export function computeNextRunAt(from, frequency) {
  const date = new Date(from)
  if (frequency === 'MONTHLY') {
    date.setMonth(date.getMonth() + 1)
  } else if (frequency === 'YEARLY') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setDate(date.getDate() + (FREQUENCY_DAYS[frequency] || 30))
  }
  return date
}

export async function createRecurringTemplate(db, data) {
  const { items, ...rest } = data
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La plantilla debe tener al menos un ítem')
  }
  return db.recurringInvoiceTemplate.create({
    data: { ...rest, items, nextRunAt: new Date(data.nextRunAt || Date.now()) }
  })
}

export async function listRecurringTemplates(db) {
  return db.recurringInvoiceTemplate.findMany({
    orderBy: { nextRunAt: 'asc' },
    include: { user: { select: { id: true, name: true } } }
  })
}

export async function getRecurringTemplateById(db, id) {
  const template = await db.recurringInvoiceTemplate.findUnique({
    where: { id },
    include: { generatedInvoices: { orderBy: { createdAt: 'desc' }, take: 20 } }
  })
  if (!template) throw new Error('Plantilla no encontrada')
  return template
}

export async function updateRecurringTemplate(db, id, data) {
  const { items, ...rest } = data
  return db.recurringInvoiceTemplate.update({
    where: { id },
    data: { ...rest, ...(items ? { items } : {}) }
  })
}

export async function setRecurringTemplateActive(db, id, active) {
  return db.recurringInvoiceTemplate.update({ where: { id }, data: { active } })
}

export async function deleteRecurringTemplate(db, id) {
  return db.recurringInvoiceTemplate.delete({ where: { id } })
}
