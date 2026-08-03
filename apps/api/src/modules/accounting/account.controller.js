import {
  listAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deactivateAccount,
  activateAccount
} from './account.service.js'

export async function list(req, res) {
  try {
    const { active } = req.query
    const accounts = await listAccounts(req.db, {
      active: active === undefined ? undefined : active === 'true'
    })
    res.json({ ok: true, data: accounts })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getById(req, res) {
  try {
    const account = await getAccountById(req.db, req.params.id)
    if (!account) return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' })
    res.json({ ok: true, data: account })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const account = await createAccount(req.db, req.body)
    res.status(201).json({ ok: true, data: account })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const account = await updateAccount(req.db, req.params.id, req.body)
    res.json({ ok: true, data: account })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function deactivate(req, res) {
  try {
    const account = await deactivateAccount(req.db, req.params.id)
    res.json({ ok: true, data: account })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function activate(req, res) {
  try {
    const account = await activateAccount(req.db, req.params.id)
    res.json({ ok: true, data: account })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
