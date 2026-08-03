export async function listTaxRates(db, { active } = {}) {
  return db.taxRate.findMany({
    where: active === undefined ? {} : { active },
    orderBy: { name: 'asc' }
  })
}

export async function createTaxRate(db, data) {
  const { name, type, percentage, accountId } = data
  return db.taxRate.create({ data: { name, type, percentage: Number(percentage), accountId: accountId || null } })
}

export async function updateTaxRate(db, id, data) {
  const { name, type, percentage, accountId, active } = data
  return db.taxRate.update({
    where: { id },
    data: {
      name,
      type,
      percentage: percentage !== undefined ? Number(percentage) : undefined,
      accountId: accountId === undefined ? undefined : accountId || null,
      active
    }
  })
}

export async function deactivateTaxRate(db, id) {
  return db.taxRate.update({ where: { id }, data: { active: false } })
}

export async function activateTaxRate(db, id) {
  return db.taxRate.update({ where: { id }, data: { active: true } })
}
