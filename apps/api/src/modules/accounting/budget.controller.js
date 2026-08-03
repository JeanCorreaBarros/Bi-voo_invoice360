import { listBudgets, upsertBudget, deleteBudget, getBudgetExecution } from './budget.service.js'

export async function list(req, res) {
  try {
    const { year } = req.query
    const data = await listBudgets(req.db, { year })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function upsert(req, res) {
  try {
    const { accountId, year, month, budgetedAmount } = req.body
    if (!accountId || !year || !month || budgetedAmount === undefined) {
      return res.status(400).json({ ok: false, message: 'accountId, year, month y budgetedAmount son requeridos' })
    }
    const data = await upsertBudget(req.db, { accountId, year, month, budgetedAmount })
    res.status(201).json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function remove(req, res) {
  try {
    await deleteBudget(req.db, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function execution(req, res) {
  try {
    const { year, month } = req.query
    if (!year || !month) return res.status(400).json({ ok: false, message: 'year y month son requeridos' })
    const data = await getBudgetExecution(req.db, { year, month })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
