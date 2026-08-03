import { createJournalEntryInTx, round2 } from '../modules/accounting/journalEntry.service.js'

// Causación automática (Fase A): reglas contables deterministas, sin IA real
// todavía. Se activan/desactivan con los mismos toggles de "Eventos de
// Automatización" en Configuración > Integración IA (fact_causacion_automatica,
// cont_causacion_compras, cont_causacion_pagos) — no requieren un proveedor
// de IA configurado, son reglas fijas de causación.
//
// Todas reciben `tx`: la transacción YA ABIERTA por el servicio que llama
// (invoice/purchase/payment .service.js), para que la creación del
// comprobante sea atómica con el documento que lo origina. Si el evento no
// está activo o falta parametrización, devuelven `null` sin error (no
// bloquean la operación de negocio). Si el evento SÍ está activo y falla la
// creación del comprobante, el error se propaga y revierte toda la
// transacción — con causación activada, un documento sin su comprobante
// contable es un error real, no algo que deba pasar en silencio.

async function isEventEnabled(tx, eventId) {
  const settings = await tx.aIIntegrationSettings.findFirst()
  return Boolean(settings?.enabledEvents?.includes(eventId))
}

async function getAccountingSettings(tx) {
  return tx.accountingSettings.findFirst()
}

// Factura de venta: Débito Cartera, Crédito Ventas + IVA generado.
// Si hay costo de mercancía vendida: además Débito Costo de Venta / Crédito Inventario.
export async function causeInvoiceSale(tx, { invoiceId, date, userId, subtotal, tax, costOfGoods }) {
  if (!(await isEventEnabled(tx, 'fact_causacion_automatica'))) return null

  const settings = await getAccountingSettings(tx)
  if (!settings?.accountsReceivableAccountId || !settings?.salesAccountId || !settings?.salesTaxAccountId) {
    return null
  }

  const total = round2(Number(subtotal) + Number(tax))

  const lines = [
    { accountId: settings.accountsReceivableAccountId, debit: total, credit: 0, description: 'Cartera' },
    { accountId: settings.salesAccountId, debit: 0, credit: round2(subtotal), description: 'Venta' },
    { accountId: settings.salesTaxAccountId, debit: 0, credit: round2(tax), description: 'IVA generado' }
  ]

  if (Number(costOfGoods) > 0 && settings.costOfSalesAccountId && settings.inventoryAccountId) {
    const cost = round2(costOfGoods)
    lines.push(
      { accountId: settings.costOfSalesAccountId, debit: cost, credit: 0, description: 'Costo de venta' },
      { accountId: settings.inventoryAccountId, debit: 0, credit: cost, description: 'Salida de inventario' }
    )
  }

  return createJournalEntryInTx(tx, {
    type: 'DIARIO',
    date,
    description: 'Causación automática de factura de venta',
    source: 'INVOICE',
    sourceId: String(invoiceId),
    createdBy: userId,
    lines
  })
}

// Compra: Débito Inventario + IVA descontable, Crédito Proveedores.
// Simplificación de fase A: el IVA de la compra se lleva a la misma cuenta
// "IVA por pagar" (posición neta), no a una cuenta de IVA descontable separada.
export async function causePurchase(tx, { purchaseId, date, userId, subtotal, tax }) {
  if (!(await isEventEnabled(tx, 'cont_causacion_compras'))) return null

  const settings = await getAccountingSettings(tx)
  if (!settings?.inventoryAccountId || !settings?.accountsPayableAccountId) return null

  const lines = [
    { accountId: settings.inventoryAccountId, debit: round2(subtotal), credit: 0, description: 'Compra de mercancía' }
  ]

  if (Number(tax) > 0 && settings.salesTaxAccountId) {
    lines.push({ accountId: settings.salesTaxAccountId, debit: round2(tax), credit: 0, description: 'IVA descontable' })
  }

  lines.push({
    accountId: settings.accountsPayableAccountId,
    debit: 0,
    credit: round2(Number(subtotal) + Number(tax)),
    description: 'Proveedores'
  })

  return createJournalEntryInTx(tx, {
    type: 'DIARIO',
    date,
    description: 'Causación automática de compra',
    source: 'PURCHASE',
    sourceId: String(purchaseId),
    createdBy: userId,
    lines
  })
}

// Pago recibido de un cliente: Débito Caja/Bancos (según método), Crédito Cartera.
export async function causeInvoicePayment(tx, { paymentId, date, userId, amount, method }) {
  if (!(await isEventEnabled(tx, 'cont_causacion_pagos'))) return null

  const settings = await getAccountingSettings(tx)
  const debitAccountId = method === 'CASH' ? settings?.cashAccountId : settings?.bankAccountId
  if (!debitAccountId || !settings?.accountsReceivableAccountId) return null

  const lines = [
    { accountId: debitAccountId, debit: round2(amount), credit: 0, description: 'Recaudo' },
    { accountId: settings.accountsReceivableAccountId, debit: 0, credit: round2(amount), description: 'Aplicación a cartera' }
  ]

  return createJournalEntryInTx(tx, {
    type: 'INGRESO',
    date,
    description: 'Causación automática de pago recibido',
    source: 'PAYMENT',
    sourceId: String(paymentId),
    createdBy: userId,
    lines
  })
}

// Pago A un proveedor: Débito Proveedores, Crédito Caja/Bancos (según método).
// Reutiliza el mismo evento que el pago recibido de cliente (ambos son
// "causación automática de pagos", solo cambia el sentido del asiento).
export async function causePurchasePayment(tx, { purchasePaymentId, date, userId, amount, method }) {
  if (!(await isEventEnabled(tx, 'cont_causacion_pagos'))) return null

  const settings = await getAccountingSettings(tx)
  const creditAccountId = method === 'CASH' ? settings?.cashAccountId : settings?.bankAccountId
  if (!creditAccountId || !settings?.accountsPayableAccountId) return null

  const lines = [
    { accountId: settings.accountsPayableAccountId, debit: round2(amount), credit: 0, description: 'Aplicación a cuentas por pagar' },
    { accountId: creditAccountId, debit: 0, credit: round2(amount), description: 'Pago a proveedor' }
  ]

  return createJournalEntryInTx(tx, {
    type: 'EGRESO',
    date,
    description: 'Causación automática de pago a proveedor',
    source: 'PURCHASE_PAYMENT',
    sourceId: String(purchasePaymentId),
    createdBy: userId,
    lines
  })
}
