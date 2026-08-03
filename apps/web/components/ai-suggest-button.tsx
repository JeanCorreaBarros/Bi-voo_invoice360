"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

// Botón genérico que llama al proveedor de IA configurado (vía el mismo
// endpoint del chat) con el prompt del evento + un contexto de texto libre,
// y entrega la respuesta cruda al llamador. No auto-aplica nada por sí
// mismo — solo entrega la sugerencia para que el usuario decida.
export function AiSuggestButton({
  prompt,
  context,
  onResult,
  label = "Sugerir con IA",
  size = "sm",
  className = "",
}: {
  prompt: string
  context: string
  onResult: (text: string) => void
  label?: string
  size?: "sm" | "default"
  className?: string
}) {
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!context.trim() || loading) return
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `${prompt}\n\nDatos:\n${context}\n\nResponde breve y directo.` }],
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al consultar la IA")
      onResult(result.data.reply || "")
    } catch (e) {
      onResult(e instanceof Error ? `No se pudo consultar la IA: ${e.message}` : "No se pudo consultar la IA")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={loading || !context.trim()}
      onClick={run}
      className={className}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      <span className="ml-1.5">{loading ? "Consultando..." : label}</span>
    </Button>
  )
}
