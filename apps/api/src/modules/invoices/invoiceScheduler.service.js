import { createInvoice } from './invoice.service.js'
import { computeNextRunAt } from './recurringTemplate.service.js'

// Ambas fuentes (plantilla recurrente y factura programada) guardan los
// mismos campos de encabezado que espera createInvoice() más un snapshot de
// items en JSON — este helper arma el payload común a partir de cualquiera
// de las dos.
function buildInvoicePayload(source) {
  return {
    userId: source.userId,
    sellerId: source.sellerId || undefined,
    orderPrefix: source.orderPrefix,
    status: 'PENDING',
    orderReceiverName: source.orderReceiverName,
    orderReceiverNit: source.orderReceiverNit,
    orderReceiverAddress: source.orderReceiverAddress,
    orderReceiverPhone: source.orderReceiverPhone || undefined,
    orderReceiverEmail: source.orderReceiverEmail || undefined,
    paymentForms: source.paymentForms || undefined,
    paymentMethods: source.paymentMethods || undefined,
    plazoPago: source.plazoPago || undefined,
    orderTaxPer: source.orderTaxPer || undefined,
    ciiu: source.ciiu || undefined,
    autoretencion: source.autoretencion || undefined,
    globalDiscount: source.globalDiscount || undefined,
    reteFuentePercent: source.reteFuentePercent || undefined,
    reteIcaPercent: source.reteIcaPercent || undefined,
    note: source.note || undefined,
    items: source.items
  }
}

export async function runDueRecurringTemplates(db, { now = new Date() } = {}) {
  const due = await db.recurringInvoiceTemplate.findMany({ where: { active: true, nextRunAt: { lte: now } } })
  const results = []

  for (const template of due) {
    try {
      const invoice = await createInvoice(db, buildInvoicePayload(template))
      await db.invoice.update({ where: { id: invoice.id }, data: { recurringTemplateId: template.id } })
      await db.recurringInvoiceTemplate.update({
        where: { id: template.id },
        data: {
          lastRunAt: now,
          nextRunAt: computeNextRunAt(template.nextRunAt, template.frequency),
          lastError: null,
          runCount: { increment: 1 }
        }
      })
      results.push({ templateId: template.id, ok: true, invoiceId: invoice.id })
    } catch (error) {
      // No detenemos la plantilla: avanzamos igual el próximo vencimiento
      // (evita reintentos infinitos cada ciclo del cron por el mismo error,
      // ej. resolución agotada) y dejamos lastError visible para revisión.
      await db.recurringInvoiceTemplate.update({
        where: { id: template.id },
        data: { lastError: error.message, nextRunAt: computeNextRunAt(template.nextRunAt, template.frequency) }
      })
      results.push({ templateId: template.id, ok: false, message: error.message })
    }
  }

  return results
}

export async function runDueScheduledInvoices(db, { now = new Date() } = {}) {
  const due = await db.scheduledInvoice.findMany({ where: { status: 'PENDING', scheduledFor: { lte: now } } })
  const results = []

  for (const scheduled of due) {
    try {
      const invoice = await createInvoice(db, buildInvoicePayload(scheduled))
      await db.scheduledInvoice.update({ where: { id: scheduled.id }, data: { status: 'SENT', invoiceId: invoice.id } })
      results.push({ scheduledInvoiceId: scheduled.id, ok: true, invoiceId: invoice.id })
    } catch (error) {
      await db.scheduledInvoice.update({ where: { id: scheduled.id }, data: { status: 'FAILED', errorMessage: error.message } })
      results.push({ scheduledInvoiceId: scheduled.id, ok: false, message: error.message })
    }
  }

  return results
}
