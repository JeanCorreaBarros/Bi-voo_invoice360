import { createJournalEntryInTx, round2 } from '../accounting/journalEntry.service.js'

export async function listFixedAssets(db, { active } = {}) {
  return db.fixedAsset.findMany({
    where: active === undefined ? {} : { active },
    orderBy: { code: 'asc' }
  })
}

export async function createFixedAsset(db, data) {
  const { code, name, accountId, purchaseDate, purchaseCost, usefulLifeMonths } = data
  return db.fixedAsset.create({
    data: {
      code,
      name,
      accountId,
      purchaseDate: new Date(purchaseDate),
      purchaseCost: Number(purchaseCost),
      usefulLifeMonths: Number(usefulLifeMonths)
    }
  })
}

export async function updateFixedAsset(db, id, data) {
  const { code, name, accountId, purchaseDate, purchaseCost, usefulLifeMonths, active } = data
  return db.fixedAsset.update({
    where: { id },
    data: {
      code,
      name,
      accountId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      purchaseCost: purchaseCost !== undefined ? Number(purchaseCost) : undefined,
      usefulLifeMonths: usefulLifeMonths !== undefined ? Number(usefulLifeMonths) : undefined,
      active
    }
  })
}

export async function deactivateFixedAsset(db, id) {
  return db.fixedAsset.update({ where: { id }, data: { active: false } })
}

// Calcula y contabiliza UN periodo de depreciación en línea recta para un
// activo. No corre automático — el usuario la dispara desde la UI (o un
// futuro job programado), ya que la depreciación es un proceso de cierre de
// periodo, no un evento por transacción.
export async function runDepreciation(db, assetId, userId) {
  return db.$transaction(async (tx) => {
    const asset = await tx.fixedAsset.findUnique({ where: { id: assetId } })
    if (!asset) throw new Error('Activo no encontrado')
    if (!asset.active) throw new Error('El activo está inactivo')

    const monthlyDepreciation = round2(Number(asset.purchaseCost) / asset.usefulLifeMonths)
    const remaining = round2(Number(asset.purchaseCost) - Number(asset.accumulatedDepreciation))

    if (remaining <= 0) {
      throw new Error('El activo ya está totalmente depreciado')
    }

    const amount = Math.min(monthlyDepreciation, remaining)

    const settings = await tx.accountingSettings.findFirst()
    if (!settings?.depreciationExpenseAccountId || !settings?.accumulatedDepreciationAccountId) {
      throw new Error('Falta configurar las cuentas de depreciación en Configuración Contable')
    }

    const entry = await createJournalEntryInTx(tx, {
      type: 'AJUSTE',
      date: new Date(),
      description: `Depreciación de ${asset.name}`,
      source: 'DEPRECIATION',
      sourceId: asset.id,
      createdBy: userId,
      lines: [
        { accountId: settings.depreciationExpenseAccountId, debit: amount, credit: 0, description: asset.name },
        { accountId: settings.accumulatedDepreciationAccountId, debit: 0, credit: amount, description: asset.name }
      ]
    })

    const updated = await tx.fixedAsset.update({
      where: { id: assetId },
      data: {
        accumulatedDepreciation: round2(Number(asset.accumulatedDepreciation) + amount),
        lastDepreciatedAt: new Date()
      }
    })

    return { asset: updated, journalEntry: entry, amount }
  })
}
