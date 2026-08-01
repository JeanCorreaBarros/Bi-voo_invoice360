"use client"

import React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Rocket, Eye, EyeOff, AlertCircle } from "lucide-react"

/* ─────────────────────────────────────────────
   BORDE DE NUBES
   Utilizamos SVG Arcs (A) para crear lóbulos perfectamente
   redondeados que imitan el diseño de referencia.
   Cada capa es de color blanco con opacidad incremental
   para generar el efecto de profundidad sobre el fondo azul.
───────────────────────────────────────────── */

const SVG_W = 310
const SVG_H = 600

// Genera un borde orgánico de nubes usando un array de patrones (tamaño de lóbulo y curvatura)
function buildCloudPath(baseX: number, pattern: { lobe: number, rMult: number }[]) {
  let d = `M ${SVG_W} 0 L ${baseX} 0`
  let y = 0
  let i = 0
  while (y < SVG_H) {
    const p = pattern[i % pattern.length]
    const lobe = p.lobe
    const end = Math.min(y + lobe, SVG_H)
    const L = end - y
    const r = L * p.rMult

    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    d += ` A ${r} ${r} 0 0 0 ${baseX} ${end}`
    y += lobe
    i++
  }
  d += ` L ${SVG_W} ${SVG_H} Z`
  return d
}

// Capas orgánicas de blanco con opacidades para calcar la referencia
const CLOUD_LAYERS = [
  {
    baseX: 140, fill: "#ffffff", opacity: 0.08,
    pattern: [{ lobe: 190, rMult: 0.52 }, { lobe: 240, rMult: 0.58 }, { lobe: 160, rMult: 0.55 }, { lobe: 210, rMult: 0.51 }]
  },
  {
    baseX: 170, fill: "#ffffff", opacity: 0.18,
    pattern: [{ lobe: 150, rMult: 0.55 }, { lobe: 190, rMult: 0.52 }, { lobe: 130, rMult: 0.58 }, { lobe: 170, rMult: 0.54 }]
  },
  {
    baseX: 200, fill: "#ffffff", opacity: 0.35,
    pattern: [{ lobe: 170, rMult: 0.51 }, { lobe: 120, rMult: 0.55 }, { lobe: 180, rMult: 0.6 }, { lobe: 140, rMult: 0.52 }]
  },
  {
    baseX: 230, fill: "#ffffff", opacity: 0.6,
    pattern: [{ lobe: 120, rMult: 0.58 }, { lobe: 160, rMult: 0.52 }, { lobe: 100, rMult: 0.51 }, { lobe: 150, rMult: 0.55 }, { lobe: 130, rMult: 0.53 }]
  },
  {
    baseX: 260, fill: "#ffffff", opacity: 1,
    pattern: [
      { lobe: 95, rMult: 0.52 },
      { lobe: 140, rMult: 0.55 },
      { lobe: 80, rMult: 0.10 },
      { lobe: 150, rMult: 0.80 },
      { lobe: 90, rMult: 0.30 },
      { lobe: 90, rMult: 0.30 },
      { lobe: 90, rMult: 0.30 },
      { lobe: 120, rMult: 0.52 },
      { lobe: 110, rMult: 0.50 },
      { lobe: 120, rMult: 0.52 },
    ]
  },
]

function CloudEdgeVertical() {
  return (
    <svg
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[52%] min-w-[170px] max-w-[320px] translate-x-px"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {CLOUD_LAYERS.map((l, i) => (
        <path key={i} d={buildCloudPath(l.baseX, l.pattern)} fill={l.fill} opacity={l.opacity} />
      ))}
    </svg>
  )
}

// Versión horizontal (mobile) adaptada al mismo sistema
const SVG_W_M = 600
const SVG_H_M = 400
const CROSS = SVG_H_M / SVG_W
const ALONG = SVG_W_M / SVG_H

function buildCloudPathHorizontal(baseY: number, pattern: { lobe: number, rMult: number }[]) {
  let d = `M 0 ${SVG_H_M} L 0 ${baseY}`
  let x = -500
  let i = 0
  while (x < SVG_W_M) {
    const p = pattern[i % pattern.length]
    const lobe = p.lobe
    const end = Math.min(x + lobe, SVG_W_M)
    const L = end - x
    const r = L * p.rMult

    // Para la versión horizontal, sweep-flag es 1 para abombar hacia arriba (menor Y)
    d += ` A ${r} ${r} 0 0 1 ${end} ${baseY}`
    x += lobe
    i++
  }
  d += ` L ${SVG_W_M} ${SVG_H_M} Z`
  return d
}

const CLOUD_LAYERS_H = CLOUD_LAYERS.map(({ baseX, fill, opacity, pattern }) => ({
  baseY: baseX * CROSS,
  fill,
  opacity,
  pattern: pattern.map(p => ({
    lobe: p.lobe * ALONG,
    rMult: p.rMult
  }))
}))

function CloudEdgeHorizontal() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-[130px] translate-y-px"
      viewBox={`0 0 ${SVG_W_M} ${SVG_H_M}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {CLOUD_LAYERS_H.map((l, i) => (
        <path key={i} d={buildCloudPathHorizontal(l.baseY, l.pattern)} fill={l.fill} opacity={l.opacity} />
      ))}
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const errorMsg = await login(email, password)
    if (errorMsg !== null) {
      setError(errorMsg)
    }
    setIsLoading(false)
  }

  const inputClass =
    "h-12 w-full px-4 rounded-lg border border-transparent bg-[hsl(217,60%,97%)] placeholder:text-gray-400 text-sm text-[hsl(222,15%,10%)] focus:outline-none focus:ring-2 focus:ring-[hsl(213,88%,52%)] focus:bg-white transition-all"

  return (
    <div className="min-h-screen w-full bg-white grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-2">

      {/* ══════ Panel azul ══════ */}
      {/* Desktop: columna izquierda a pantalla completa. Mobile: banda superior. */}
      <div className="relative overflow-hidden bg-gradient-to-b lg:bg-gradient-to-br from-[hsl(213,85%,48%)] to-[hsl(214,84%,32%)] text-white px-8 pt-14 pb-24 lg:p-12 flex flex-col items-center justify-center lg:justify-between">

        {/* Nubes: verticales en desktop, horizontales en mobile */}
        <div className="hidden lg:block">
          <CloudEdgeVertical />
        </div>
        <div className="lg:hidden">
          <CloudEdgeHorizontal />
        </div>

        {/* Espaciador para el justify-between del desktop */}
        <div className="hidden lg:block relative z-10 h-4" />

        <div className="relative z-10 flex flex-col items-center text-center gap-5 lg:gap-7 lg:pr-[22%]">
          <p className="text-xl lg:text-3xl font-semibold">Bienvenido a</p>

          <div className="w-24 h-24 lg:w-36 lg:h-36 rounded-full bg-white flex items-center justify-center shadow-2xl">
            <Rocket
              className="h-10 w-10 lg:h-16 lg:w-16 text-[hsl(213,88%,45%)]"
              strokeWidth={1.5}
            />
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight leading-none">
            Invoice360
            <span className="block text-[10px] lg:text-xs font-semibold uppercase tracking-[0.3em] text-white/70 mt-2">
              by <span className="bg-gradient-to-r from-purple-300 to-pink-300 text-transparent bg-clip-text font-black drop-shadow-[0_0_12px_rgba(216,180,254,0.4)]">Bi-voo</span>
            </span>
          </h1>

          <p className="hidden lg:block text-sm text-white/85 leading-relaxed max-w-[19rem]">
            Gestiona tu facturación, inventario, contabilidad y cartera en un solo lugar.
            Ingresa a tu cuenta y continúa gestionando tu negocio.
          </p>
        </div>

        <p className="hidden lg:block relative z-10 lg:pr-[22%] text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
          © {new Date().getFullYear()} <span className="text-purple-300 font-bold">Bi-voo</span>
        </p>
      </div>

      {/* ══════ Panel del formulario ══════ */}
      {/* Las nubes "comen" parte del panel azul, así que el blanco se ve más
          ancho de lo que en verdad es su columna. Compensamos corriendo el
          bloque del form un poco a la izquierda en desktop. */}
      <div className="relative z-10 flex flex-col justify-center bg-white px-7 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm mx-auto lg:-translate-x-8">
          <h2 className="text-2xl lg:text-[30px] font-bold text-[hsl(222,15%,10%)] text-center mb-8">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(0,84%,60%,0.08)] border border-[hsl(0,84%,60%,0.25)] text-[hsl(0,72%,48%)]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[hsl(222,15%,10%)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-[hsl(222,15%,10%)]">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 mt-3 rounded-lg bg-gradient-to-r from-[hsl(213,85%,48%)] to-[hsl(214,84%,38%)] text-white font-bold text-[15px] shadow-lg shadow-[hsl(213,85%,48%,0.3)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
            Al iniciar sesión aceptas los Términos de Servicio
            <br className="hidden sm:block" /> y la Política de Privacidad de <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text font-bold">Bi-voo</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
