export async function listCostCenters(db, { active } = {}) {
  return db.costCenter.findMany({
    where: active === undefined ? {} : { active },
    orderBy: { code: 'asc' }
  })
}

export async function createCostCenter(db, data) {
  const { code, name } = data
  return db.costCenter.create({ data: { code, name } })
}

export async function updateCostCenter(db, id, data) {
  const { code, name, active } = data
  return db.costCenter.update({ where: { id }, data: { code, name, active } })
}

export async function deactivateCostCenter(db, id) {
  return db.costCenter.update({ where: { id }, data: { active: false } })
}

export async function activateCostCenter(db, id) {
  return db.costCenter.update({ where: { id }, data: { active: true } })
}
