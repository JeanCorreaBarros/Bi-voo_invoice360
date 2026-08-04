import * as service from './recurringTemplate.service.js'

export async function create(req, res) {
  try {
    const template = await service.createRecurringTemplate(req.db, req.body)
    res.status(201).json({ ok: true, data: template })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function list(req, res) {
  try {
    const data = await service.listRecurringTemplates(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getById(req, res) {
  try {
    const data = await service.getRecurringTemplateById(req.db, req.params.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const data = await service.updateRecurringTemplate(req.db, req.params.id, req.body)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function deactivate(req, res) {
  try {
    const data = await service.setRecurringTemplateActive(req.db, req.params.id, false)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function activate(req, res) {
  try {
    const data = await service.setRecurringTemplateActive(req.db, req.params.id, true)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function remove(req, res) {
  try {
    await service.deleteRecurringTemplate(req.db, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
