import { getAISettings, updateAISettings, updateEnabledEvents, updateEventPrompts } from './aiSettings.service.js'

export async function get(req, res) {
  try {
    const settings = await getAISettings(req.db)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const settings = await updateAISettings(req.db, req.body)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function updateEvents(req, res) {
  try {
    const { enabledEvents } = req.body
    if (!Array.isArray(enabledEvents)) {
      return res.status(400).json({ ok: false, message: 'enabledEvents debe ser una lista' })
    }
    const settings = await updateEnabledEvents(req.db, enabledEvents)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function updateEventPromptsHandler(req, res) {
  try {
    const { eventPrompts } = req.body
    if (!eventPrompts || typeof eventPrompts !== 'object' || Array.isArray(eventPrompts)) {
      return res.status(400).json({ ok: false, message: 'eventPrompts debe ser un objeto' })
    }
    const settings = await updateEventPrompts(req.db, eventPrompts)
    res.json({ ok: true, data: settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
