import { sendChatMessage } from './aiChat.service.js'

export async function chat(req, res) {
  try {
    const { messages } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, message: 'messages debe ser una lista no vacía' })
    }
    const reply = await sendChatMessage(req.db, messages)
    res.json({ ok: true, data: { reply } })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
