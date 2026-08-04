import { decrypt } from '../../lib/crypto.js'

const DEFAULT_SYSTEM_PROMPT =
  'Eres el asistente de IA de Bi360 by Bi-voo. Ayudas al usuario con preguntas de facturación y contabilidad de su empresa.'

async function callOpenAI({ apiKey, model, temperature, systemPrompt, messages }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: temperature ?? 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Error al llamar a OpenAI')
  return data.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic({ apiKey, model, systemPrompt, messages }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Error al llamar a Anthropic')
  return data.content?.[0]?.text ?? ''
}

// Único punto de salida hacia proveedores de IA externos. Usa la
// configuración cifrada en AIIntegrationSettings — nunca recibe el API key
// desde el cliente.
export async function sendChatMessage(db, messages) {
  const settings = await db.aIIntegrationSettings.findFirst()

  if (!settings?.apiKeyCiphertext || !settings.provider) {
    throw new Error('No hay una integración de IA configurada. Configura un proveedor y un API key primero.')
  }
  if (!settings.active) {
    throw new Error('La integración de IA está desactivada.')
  }

  const apiKey = decrypt({
    ciphertext: settings.apiKeyCiphertext,
    iv: settings.apiKeyIv,
    authTag: settings.apiKeyAuthTag
  })
  const systemPrompt = settings.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT

  if (settings.provider === 'OPENAI') {
    return callOpenAI({ apiKey, model: settings.model, temperature: settings.temperature, systemPrompt, messages })
  }
  if (settings.provider === 'ANTHROPIC') {
    return callAnthropic({ apiKey, model: settings.model, systemPrompt, messages })
  }
  throw new Error('El proveedor de IA configurado no está soportado para chat todavía.')
}
