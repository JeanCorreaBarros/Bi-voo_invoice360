"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X, ArrowUp, Plus, Settings } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type ChatMessage = { role: "user" | "assistant"; content: string }

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const SLEEP_AFTER_MS = 45000
const IDLE_ANIM_MIN_MS = 4000
const IDLE_ANIM_MAX_MS = 9000

type OrbMood = "idle" | "wave" | "wiggle" | "blink" | "sleep"

// Orbe brillante 3D hecho con gradientes CSS (sin imágenes), en el azul de
// la app (hsl(209,79%,35%)). Es el avatar de Voix: aparece como botón
// flotante cuando el chat está cerrado, y como avatar dentro del panel.
// Los ojos siguen el cursor por toda la página, las "manitos" (los dos
// puntitos) se mueven de vez en cuando, y si nadie interactúa un rato el
// orbe se queda dormido.
function ChatOrb({ size = 56 }: { size?: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const leftEyeRef = useRef<HTMLSpanElement>(null)
  const rightEyeRef = useRef<HTMLSpanElement>(null)
  const [mood, setMood] = useState<OrbMood>("idle")
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    const maxOffset = size * 0.045
    const handleActivity = (e?: MouseEvent) => {
      lastActivityRef.current = Date.now()
      setMood((m) => (m === "sleep" ? "idle" : m))
      if (!e) return
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      const dx = Math.cos(angle) * maxOffset
      const dy = Math.sin(angle) * maxOffset
      const transform = `translate(${dx}px, ${dy}px)`
      if (leftEyeRef.current) leftEyeRef.current.style.transform = transform
      if (rightEyeRef.current) rightEyeRef.current.style.transform = transform
    }
    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("mousedown", handleActivity)
    window.addEventListener("keydown", () => handleActivity())
    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("mousedown", handleActivity)
      window.removeEventListener("keydown", () => handleActivity())
    }
  }, [size])

  useEffect(() => {
    const check = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current
      setMood((m) => {
        if (idleFor > SLEEP_AFTER_MS) return "sleep"
        if (m === "sleep") return "idle"
        return m
      })
    }, 2000)
    return () => clearInterval(check)
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = IDLE_ANIM_MIN_MS + Math.random() * (IDLE_ANIM_MAX_MS - IDLE_ANIM_MIN_MS)
      timeout = setTimeout(() => {
        setMood((m) => {
          if (m === "sleep") return m
          const options: OrbMood[] = ["wave", "wiggle", "blink"]
          return options[Math.floor(Math.random() * options.length)]
        })
        setTimeout(() => setMood((m) => (m === "sleep" ? m : "idle")), 850)
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  const isSleeping = mood === "sleep"
  const eyeSize = Math.max(4, size * 0.2)

  const dotStyle = {
    width: size * 0.18,
    height: size * 0.18,
    background: "radial-gradient(circle at 35% 30%, hsl(209,90%,72%), hsl(209,79%,42%) 60%, hsl(209,85%,26%))",
    boxShadow: "inset -2px -2px 4px rgba(0,10,30,0.3), inset 2px 2px 3px rgba(255,255,255,0.5)",
  }

  return (
    <div ref={rootRef} className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      {/* manitos: los 2 puntitos a los lados del orbe */}
      <span
        className={`absolute rounded-full ${mood === "wave" ? "animate-[orb-wave_0.7s_ease-in-out]" : ""}`}
        style={{ ...dotStyle, left: -size * 0.08, top: size * 0.42 }}
      />
      <span
        className={`absolute rounded-full ${mood === "wave" ? "animate-[orb-wave_0.7s_ease-in-out]" : ""}`}
        style={{ ...dotStyle, right: -size * 0.08, top: size * 0.42 }}
      />

      {/* cuerpo */}
      <div
        className={`absolute inset-0 rounded-full overflow-hidden ${
          isSleeping
            ? "animate-[orb-breathe_3.2s_ease-in-out_infinite]"
            : `animate-[orb-float_3s_ease-in-out_infinite] ${mood === "wiggle" ? "animate-[orb-wiggle_0.6s_ease-in-out]" : ""}`
        }`}
        style={{
          background:
            "radial-gradient(circle at 32% 26%, hsl(209,95%,82%) 0%, hsl(209,88%,58%) 35%, hsl(209,79%,38%) 70%, hsl(209,85%,22%) 100%)",
          boxShadow:
            "inset -6px -8px 14px rgba(0,20,50,0.35), inset 5px 6px 10px rgba(255,255,255,0.55), 0 6px 16px rgba(20,70,140,0.4)",
        }}
      >
        {/* ojos: óvalos blancos lisos, sin pupila, que se desplazan levemente hacia el cursor */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center" style={{ top: "38%", gap: eyeSize * 0.55 }}>
          <span
            ref={leftEyeRef}
            className={`inline-block rounded-full bg-white transition-[height] duration-150 ${mood === "blink" ? "animate-[orb-blink_0.35s_ease-in-out]" : ""}`}
            style={{ width: eyeSize * 0.8, height: isSleeping ? Math.max(1.5, eyeSize * 0.16) : eyeSize }}
          />
          <span
            ref={rightEyeRef}
            className={`inline-block rounded-full bg-white transition-[height] duration-150 ${mood === "blink" ? "animate-[orb-blink_0.35s_ease-in-out]" : ""}`}
            style={{ width: eyeSize * 0.8, height: isSleeping ? Math.max(1.5, eyeSize * 0.16) : eyeSize }}
          />
        </div>

        {/* zzz mientras duerme */}
        {isSleeping && (
          <>
            <span
              className="absolute text-white/90 font-black"
              style={{ top: "-6%", right: "0%", fontSize: size * 0.16, animation: "orb-zzz 2.4s ease-in-out infinite" }}
            >
              z
            </span>
            <span
              className="absolute text-white/80 font-black"
              style={{ top: "-10%", right: "-14%", fontSize: size * 0.11, animation: "orb-zzz 2.4s ease-in-out infinite 0.6s" }}
            >
              z
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// Burbuja de chat flotante global. Solo se muestra si la empresa activó
// "Chat Flotante" en Configuración → Integración IA. El toggle solo
// controla la visibilidad de esta UI — el resto de la IA (eventos,
// automatizaciones) funciona igual esté o no visible.
export function AiChatBubble() {
  const pathname = usePathname()
  const router = useRouter()
  const [chatEnabled, setChatEnabled] = useState(false)
  const [checked, setChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pathname === "/") {
      setChecked(true)
      return
    }
    const token = getToken()
    if (!token) {
      setChecked(true)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}settings/ai`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const result = await res.json()
        if (!cancelled && result.ok && result.data) {
          setChatEnabled(Boolean(result.data.chatEnabled))
        }
      } catch {
        // silencioso: si falla la carga, simplemente no se muestra la burbuja
      } finally {
        if (!cancelled) setChecked(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pathname])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open])

  const nuevaConversacion = () => {
    setMessages([])
    setError(null)
  }

  const enviarMensaje = async () => {
    const text = input.trim()
    if (!text || sending) return

    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")
    setError(null)
    setSending(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ messages: next }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) {
        throw new Error(result?.message || "Error al hablar con el agente")
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.data.reply || "" }])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al hablar con el agente")
    } finally {
      setSending(false)
    }
  }

  if (!checked || !chatEnabled || pathname === "/") return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4">
      {open && (
        <div className="w-[min(92vw,380px)] h-[min(70vh,520px)] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <ChatOrb size={36} />
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Voix</p>
                <p className="text-xs text-gray-400 leading-tight flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> En línea
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/configuracion")}
                aria-label="Configuración del asistente"
                title="Configuración"
                className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-[#F7F9FC]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <ChatOrb size={44} />
                <p className="text-sm text-gray-400">¿En qué te puedo ayudar?</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[hsl(209,79%,35%)] text-white rounded-br-sm"
                      : "bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm">
                  Escribiendo...
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex items-center gap-2 bg-white shrink-0">
            <button
              onClick={nuevaConversacion}
              aria-label="Nueva conversación"
              title="Nueva conversación"
              className="h-9 w-9 rounded-full bg-[hsl(209,79%,35%,0.08)] hover:bg-[hsl(209,79%,35%,0.15)] text-[hsl(209,79%,35%)] flex items-center justify-center shrink-0 transition-colors"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>
            <input
              className="flex-1 h-10 px-3.5 rounded-full border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(209,79%,35%,0.3)]"
              placeholder="Escribe tu mensaje..."
              value={input}
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") enviarMensaje() }}
            />
            <button
              onClick={enviarMensaje}
              disabled={sending || !input.trim()}
              aria-label="Enviar mensaje"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                input.trim() && !sending
                  ? "bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      )}

      {open ? (
        <button
          onClick={() => setOpen(false)}
          aria-label="Cerrar chat"
          className="h-14 w-14 rounded-full bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        >
          <X className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir chat con Voix"
          className="drop-shadow-xl transition-transform hover:scale-105"
        >
          <ChatOrb size={56} />
        </button>
      )}
    </div>
  )
}
