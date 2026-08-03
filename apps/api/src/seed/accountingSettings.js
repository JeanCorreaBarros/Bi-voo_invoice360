// Sembra la parametrización contable con las cuentas estándar del PUC que
// ya siembra chartOfAccounts.js, para que la causación automática (Fase A)
// funcione desde el día uno sin que la empresa tenga que configurar nada.
// Editable después desde Contabilidad > Configuración Contable.
const DEFAULT_CODES = {
  salesAccountId: '413595', // Comercio al por Mayor y al por Menor
  salesTaxAccountId: '240810', // Impuesto a las Ventas por Pagar (IVA)
  accountsReceivableAccountId: '130505', // Clientes Nacionales
  inventoryAccountId: '143505', // Inventario de Mercancías
  costOfSalesAccountId: '613505', // Costo de Mercancía Vendida
  accountsPayableAccountId: '220505', // Proveedores Nacionales
  cashAccountId: '110505', // Caja General
  bankAccountId: '111005', // Bancos Nacionales
  depreciationExpenseAccountId: '515206', // Depreciación de Propiedades, Planta y Equipo
  accumulatedDepreciationAccountId: '159205', // Depreciación Acumulada
  retainedEarningsAccountId: '360505' // Utilidad del Ejercicio
}

// Idempotente: si ya existe una fila, solo rellena los campos que estén en
// null (ej. campos nuevos agregados después) — nunca pisa un valor que la
// empresa ya haya personalizado.
export async function seedAccountingSettings(tenantDb) {
  const codes = Object.values(DEFAULT_CODES)
  const accounts = await tenantDb.account.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true }
  })
  const idByCode = new Map(accounts.map((a) => [a.code, a.id]))

  const existing = await tenantDb.accountingSettings.findFirst()

  if (!existing) {
    const data = {}
    for (const [field, code] of Object.entries(DEFAULT_CODES)) {
      data[field] = idByCode.get(code) ?? null
    }
    return tenantDb.accountingSettings.create({ data })
  }

  const patch = {}
  for (const [field, code] of Object.entries(DEFAULT_CODES)) {
    if (!existing[field] && idByCode.get(code)) {
      patch[field] = idByCode.get(code)
    }
  }

  if (Object.keys(patch).length === 0) return existing
  return tenantDb.accountingSettings.update({ where: { id: existing.id }, data: patch })
}
