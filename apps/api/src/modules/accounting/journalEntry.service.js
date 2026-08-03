export function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

export function assertBalanced(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('El comprobante necesita al menos 2 líneas')
  }

  let totalDebit = 0
  let totalCredit = 0

  for (const line of lines) {
    if (!line.accountId) {
      throw new Error('Cada línea necesita una cuenta')
    }
    totalDebit += Number(line.debit || 0)
    totalCredit += Number(line.credit || 0)
  }

  if (round2(totalDebit) !== round2(totalCredit)) {
    throw new Error(
      `El comprobante no cuadra: débitos ${round2(totalDebit)} vs créditos ${round2(totalCredit)}`
    )
  }

  return { totalDebit: round2(totalDebit), totalCredit: round2(totalCredit) }
}

export async function listJournalEntries(db, { page = 1, limit = 20, type, status, search } = {}) {
  const skip = (Number(page) - 1) * Number(limit)

  const trimmed = search?.trim()
  const searchNumber = trimmed && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined

  const where = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(trimmed
      ? {
          OR: [
            { description: { contains: trimmed, mode: 'insensitive' } },
            ...(searchNumber !== undefined ? [{ number: searchNumber }] : []),
            { lines: { some: { account: { OR: [{ name: { contains: trimmed, mode: 'insensitive' } }, { code: { contains: trimmed } }] } } } }
          ]
        }
      : {})
  }

  const [data, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { date: 'desc' },
      include: { lines: { include: { account: true } } }
    }),
    db.journalEntry.count({ where })
  ])

  return { data, meta: { total, page: Number(page), lastPage: Math.ceil(total / limit) } }
}

export async function getJournalEntryById(db, id) {
  return db.journalEntry.findUnique({
    where: { id: Number(id) },
    include: {
      lines: { include: { account: true, costCenter: true, customer: true, supplier: true } }
    }
  })
}

// Crea un comprobante balanceado dentro de una transacción YA ABIERTA por el
// llamador (`tx`). Reutilizado tanto por el endpoint manual (createJournalEntry,
// que abre su propia transacción) como por la causación automática
// (apps/api/src/lib/accountingHooks.js), que corre dentro de la transacción
// de la factura/compra/pago — Prisma no permite transacciones anidadas.
export async function createJournalEntryInTx(tx, { type, date, description, source, sourceId, createdBy, lines }) {
  assertBalanced(lines)

  const last = await tx.journalEntry.findFirst({
    where: { type },
    orderBy: { number: 'desc' }
  })
  const number = (last?.number || 0) + 1

  return tx.journalEntry.create({
    data: {
      type,
      number,
      // Si viene "YYYY-MM-DD" (input type=date), se fija a mediodía para
      // que la conversión UTC no la corra al día anterior en la vista.
      date: date ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date) : undefined,
      description,
      source: source || 'MANUAL',
      sourceId: sourceId || null,
      createdBy,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          costCenterId: line.costCenterId || null,
          customerId: line.customerId || null,
          supplierId: line.supplierId || null,
          otherThirdPartyName: line.otherThirdPartyName || null,
          otherThirdPartyNit: line.otherThirdPartyNit || null,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || null
        }))
      }
    },
    include: { lines: true }
  })
}

export async function createJournalEntry(db, data, userId) {
  return db.$transaction((tx) => createJournalEntryInTx(tx, { ...data, createdBy: userId }))
}

export async function voidJournalEntry(db, id) {
  const entry = await db.journalEntry.findUnique({ where: { id: Number(id) } })
  if (!entry) throw new Error('Comprobante no encontrado')
  if (entry.status === 'VOID') throw new Error('El comprobante ya está anulado')

  return db.journalEntry.update({
    where: { id: Number(id) },
    data: { status: 'VOID' }
  })
}
