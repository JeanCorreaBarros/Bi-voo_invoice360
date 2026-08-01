"use client"

import { motion } from "framer-motion"

const BLUE = "hsl(213,72%,56%)"
const BLUE_DARK = "hsl(213,80%,42%)"

// Ilustración del cohete: nariz, cuerpo, ventana y aletas — no el ícono genérico.
function RocketArt() {
  return (
    <svg viewBox="0 0 100 130" className="w-16 h-[5.2rem] drop-shadow-md" aria-hidden="true">
      {/* Aleta izquierda */}
      <path d="M34,72 L14,100 L34,92 Z" fill={BLUE_DARK} />
      {/* Aleta derecha */}
      <path d="M66,72 L86,100 L66,92 Z" fill={BLUE_DARK} />
      {/* Cuerpo */}
      <path
        d="M50,4
           C64,4 71,34 71,58
           C71,76 66,90 62,98
           L38,98
           C34,90 29,76 29,58
           C29,34 36,4 50,4 Z"
        fill={BLUE}
      />
      {/* Base del cuerpo */}
      <path d="M38,98 L62,98 L58,110 L42,110 Z" fill={BLUE_DARK} />
      {/* Ventana */}
      <circle cx="50" cy="46" r="13" fill="white" />
      <circle cx="50" cy="46" r="13" fill="none" stroke={BLUE_DARK} strokeWidth="2.5" />
    </svg>
  )
}

// Nube esponjosa hecha de varios círculos superpuestos.
function CloudBase({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 70" className={className} aria-hidden="true">
      <circle cx="38" cy="46" r="24" fill="white" />
      <circle cx="70" cy="30" r="30" fill="white" />
      <circle cx="108" cy="42" r="26" fill="white" />
      <circle cx="140" cy="28" r="26" fill="white" />
      <circle cx="168" cy="44" r="20" fill="white" />
      <rect x="30" y="44" width="150" height="24" rx="12" fill="white" />
    </svg>
  )
}

function Flame() {
  return (
    <motion.div
      className="w-5 -mt-2"
      style={{ transformOrigin: "top center" }}
      animate={{ scaleY: [0.75, 1.4, 0.75], scaleX: [0.9, 1.1, 0.9], opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 0.22, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 20 30" className="w-full" aria-hidden="true">
        <path d="M10,0 C3,10 1,19 10,30 C19,19 17,10 10,0 Z" fill="url(#plc-flame-gradient)" />
        <defs>
          <linearGradient id="plc-flame-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(48,100%,62%)" />
            <stop offset="100%" stopColor="hsl(18,100%,54%)" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

export function PlcLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(210,55%,97%)]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-56 h-72 overflow-hidden">
          {/* Nubes de fondo flotando */}
          <motion.div
            className="absolute top-6 left-4 w-14 h-7 rounded-full bg-white/70"
            animate={{ x: [-6, 8, -6], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-16 right-2 w-16 h-8 rounded-full bg-white/60"
            animate={{ x: [6, -8, 6], opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Cohete + llama: descansa sobre la nube y despega en loop */}
          <motion.div
            className="absolute left-1/2 bottom-16 z-20 flex flex-col items-center"
            style={{ marginLeft: -32 }}
            animate={{
              y: [0, 0, -230],
              opacity: [1, 1, 0],
              scale: [1, 1, 0.7],
            }}
            transition={{
              duration: 2.4,
              times: [0, 0.35, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: ["easeOut", "easeIn"],
            }}
          >
            <RocketArt />
            <Flame />
          </motion.div>

          {/* Nube base: la plataforma de lanzamiento (siempre visible, detrás del cohete) */}
          <div className="absolute left-1/2 bottom-4 z-10 w-44" style={{ marginLeft: "-88px" }}>
            <CloudBase className="w-full h-auto drop-shadow-sm" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[hsl(213,80%,45%)] font-semibold text-lg">Despegando...</p>
          <p className="text-gray-500 text-sm mt-1">Validando sesión</p>
        </div>
      </div>
    </div>
  )
}
