export async function listAccounts(db, { active } = {}) {
  return db.account.findMany({
    where: active === undefined ? {} : { active },
    orderBy: { code: 'asc' }
  })
}

export async function getAccountById(db, id) {
  return db.account.findUnique({ where: { id } })
}

export async function createAccount(db, data) {
  const { code, name, type, nature, level, parentId, allowsEntries } = data

  return db.account.create({
    data: { code, name, type, nature, level, parentId: parentId || null, allowsEntries: allowsEntries ?? true }
  })
}

export async function updateAccount(db, id, data) {
  const { code, name, type, nature, level, parentId, allowsEntries, active } = data

  return db.account.update({
    where: { id },
    data: {
      code,
      name,
      type,
      nature,
      level,
      parentId: parentId === undefined ? undefined : parentId || null,
      allowsEntries,
      active
    }
  })
}

export async function deactivateAccount(db, id) {
  return db.account.update({ where: { id }, data: { active: false } })
}

export async function activateAccount(db, id) {
  return db.account.update({ where: { id }, data: { active: true } })
}
