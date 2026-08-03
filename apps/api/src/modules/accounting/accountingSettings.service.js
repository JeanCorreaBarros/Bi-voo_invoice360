const FIELDS = [
  'salesAccountId',
  'salesTaxAccountId',
  'accountsReceivableAccountId',
  'inventoryAccountId',
  'costOfSalesAccountId',
  'accountsPayableAccountId',
  'cashAccountId',
  'bankAccountId',
  'depreciationExpenseAccountId',
  'accumulatedDepreciationAccountId',
  'retainedEarningsAccountId'
]

export async function getAccountingSettings(db) {
  return db.accountingSettings.findFirst()
}

export async function updateAccountingSettings(db, data) {
  const existing = await db.accountingSettings.findFirst()

  const update = {}
  for (const field of FIELDS) {
    if (data[field] !== undefined) update[field] = data[field] || null
  }

  return existing
    ? db.accountingSettings.update({ where: { id: existing.id }, data: update })
    : db.accountingSettings.create({ data: update })
}
