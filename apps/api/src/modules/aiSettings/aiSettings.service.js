import { encrypt } from '../../lib/crypto.js'

// Fila única por BD de tenant (patrón igual a CompanyProfile). Nunca se
// devuelve el API key en texto plano: solo si hay uno configurado o no.
function toPublicShape(settings) {
  if (!settings) {
    return {
      provider: null,
      model: null,
      temperature: 0.7,
      active: false,
      hasApiKey: false,
      enabledEvents: [],
      systemPrompt: '',
      eventPrompts: {},
      chatEnabled: false
    }
  }
  return {
    provider: settings.provider,
    model: settings.model,
    temperature: settings.temperature ?? 0.7,
    active: settings.active,
    hasApiKey: Boolean(settings.apiKeyCiphertext),
    enabledEvents: settings.enabledEvents ?? [],
    systemPrompt: settings.systemPrompt ?? '',
    eventPrompts: settings.eventPrompts ?? {},
    chatEnabled: settings.chatEnabled ?? false
  }
}

export async function getAISettings(db) {
  const settings = await db.aIIntegrationSettings.findFirst()
  return toPublicShape(settings)
}

export async function updateAISettings(db, data) {
  const { provider, model, apiKey, active, systemPrompt, chatEnabled, temperature } = data

  const existing = await db.aIIntegrationSettings.findFirst()

  const updateData = {
    provider,
    model,
    active: active ?? (existing?.active || false)
  }

  if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt
  if (chatEnabled !== undefined) updateData.chatEnabled = chatEnabled
  if (temperature !== undefined) updateData.temperature = temperature

  // Solo se toca el key si mandaron uno nuevo (no vacío): permite editar
  // provider/model sin tener que reescribir el key cada vez.
  if (apiKey) {
    const { ciphertext, iv, authTag } = encrypt(apiKey)
    updateData.apiKeyCiphertext = ciphertext
    updateData.apiKeyIv = iv
    updateData.apiKeyAuthTag = authTag
    updateData.active = active ?? true
  }

  const saved = existing
    ? await db.aIIntegrationSettings.update({ where: { id: existing.id }, data: updateData })
    : await db.aIIntegrationSettings.create({ data: updateData })

  return toPublicShape(saved)
}

// Activar/desactivar eventos de automatización (catálogo estático, no vive
// en BD). Separado de updateAISettings para que togglear un evento no
// requiera reenviar provider/apiKey.
export async function updateEnabledEvents(db, eventIds) {
  const existing = await db.aIIntegrationSettings.findFirst()

  const saved = existing
    ? await db.aIIntegrationSettings.update({
        where: { id: existing.id },
        data: { enabledEvents: eventIds }
      })
    : await db.aIIntegrationSettings.create({ data: { enabledEvents: eventIds } })

  return toPublicShape(saved)
}

// Prompt override por evento (mapa eventId -> texto). Igual que
// updateEnabledEvents, separado para no tener que reenviar el resto de la
// configuración al editar el prompt de un solo evento.
export async function updateEventPrompts(db, eventPrompts) {
  const existing = await db.aIIntegrationSettings.findFirst()

  const saved = existing
    ? await db.aIIntegrationSettings.update({
        where: { id: existing.id },
        data: { eventPrompts }
      })
    : await db.aIIntegrationSettings.create({ data: { eventPrompts } })

  return toPublicShape(saved)
}
