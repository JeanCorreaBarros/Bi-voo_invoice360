export async function listBankAccounts(db, { active } = {}) {
  return db.bankAccount.findMany({
    where: active === undefined ? {} : { active },
    orderBy: { bankName: 'asc' }
  })
}

export async function createBankAccount(db, data) {
  const { bankName, accountNumber, accountType, accountId } = data
  return db.bankAccount.create({ data: { bankName, accountNumber, accountType, accountId: accountId || null } })
}

export async function updateBankAccount(db, id, data) {
  const { bankName, accountNumber, accountType, accountId, active } = data
  return db.bankAccount.update({
    where: { id },
    data: { bankName, accountNumber, accountType, accountId: accountId === undefined ? undefined : accountId || null, active }
  })
}

export async function deactivateBankAccount(db, id) {
  return db.bankAccount.update({ where: { id }, data: { active: false } })
}

export async function activateBankAccount(db, id) {
  return db.bankAccount.update({ where: { id }, data: { active: true } })
}
