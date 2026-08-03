import { getAccountingSettings, updateAccountingSettings } from './accountingSettings.service.js'

export async function get(req, res) {
  try {
    const settings = await getAccountingSettings(req.db)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const settings = await updateAccountingSettings(req.db, req.body)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
