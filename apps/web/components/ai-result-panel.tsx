"use client"

import { X } from "lucide-react"

const COLORS = {
  blue: "bg-blue-50 border-blue-100 text-blue-800",
  purple: "bg-purple-50 border-purple-100 text-purple-800",
} as const

// Panel de resultado de una sugerencia/explicación de IA, con botón para
// cerrarlo — no debe quedar fijo en pantalla indefinidamente.
export function AiResultPanel({
  text,
  onClose,
  color = "blue",
}: {
  text: string
  onClose: () => void
  color?: keyof typeof COLORS
}) {
  return (
    <div className={`relative border rounded-xl px-4 py-3 pr-9 text-sm whitespace-pre-wrap ${COLORS[color]}`}>
      {text}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-2.5 right-2.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
