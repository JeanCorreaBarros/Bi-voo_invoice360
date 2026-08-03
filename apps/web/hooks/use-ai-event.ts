"use client"

import { useEffect, useState } from "react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

type AISettingsResponse = {
  active: boolean
  hasApiKey: boolean
  enabledEvents: string[]
  eventPrompts: Record<string, string>
}

// Cache en memoria de módulo: varios botones de IA en la misma página no
// deben repetir el fetch de settings/ai cada uno. Se refresca cada 15s para
// reflejar cambios hechos en Configuración sin requerir recargar la página.
let cached: AISettingsResponse | null = null
let cachedAt = 0

async function loadAISettings(): Promise<AISettingsResponse | null> {
  const now = Date.now()
  if (cached && now - cachedAt < 15000) return cached
  try {
    const token = getToken()
    const res = await fetch(`${apiBase}settings/ai`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
    if (!res.ok) return null
    const result = await res.json()
    if (!result.ok) return null
    cached = result.data
    cachedAt = now
    return cached
  } catch {
    return null
  }
}

// Da a un componente lo que necesita para mostrar (o no) un botón de
// sugerencia de IA para un evento del catálogo: si está habilitado
// (evento activo + proveedor configurado) y el prompt que debe usar
// (override guardado por el usuario, o el prompt por defecto del catálogo).
export function useAiEvent(eventId: string, defaultPrompt: string) {
  const [enabled, setEnabled] = useState(false)
  const [prompt, setPrompt] = useState(defaultPrompt)

  useEffect(() => {
    let cancelled = false
    loadAISettings().then((data) => {
      if (cancelled || !data) return
      setEnabled(Boolean(data.active && data.hasApiKey && data.enabledEvents?.includes(eventId)))
      setPrompt(data.eventPrompts?.[eventId] || defaultPrompt)
    })
    return () => {
      cancelled = true
    }
  }, [eventId, defaultPrompt])

  return { enabled, prompt }
}
