"use client"

import { useEffect, useState } from "react"
import { Activity, TrendingUp, Scale, Info } from "lucide-react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

const DEFAULT_PROMPT_EXPLICACION_INDICADORES =
  "Explica en lenguaje sencillo qué dicen estos indicadores financieros sobre la salud de la empresa (liquidez, endeudamiento y rentabilidad), y qué debería vigilar el dueño del negocio."

type Indicators = {
  asOf: string
  liquidez: { activoCorriente: number; pasivoCorriente: number; razonCorriente: number | null; pruebaAcida: number | null; capitalTrabajo: number }
  endeudamiento: { totalPasivo: number; totalActivo: number; totalPatrimonio: number; nivelEndeudamiento: number | null; endeudamientoPatrimonial: number | null }
  rentabilidad: { ingresos: number; utilidadBruta: number; utilidadNeta: number; margenBruto: number | null; margenNeto: number | null; roa: number | null; roe: number | null }
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`
}

function pct(n: number | null) {
  return n === null ? "—" : `${(n * 100).toFixed(1)}%`
}

function ratio(n: number | null) {
  return n === null ? "—" : n.toFixed(2)
}

function IndicatorCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "emerald" | "amber" | "blue" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black inline-block px-2 py-0.5 rounded-lg ${toneClasses}`}>{value}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}

export default function IndicadoresFinancierosPage() {
  const [data, setData] = useState<Indicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiExplanation, setAiExplanation] = useState("")

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_INDICADORES)

  const buildContext = () => {
    if (!data) return ""
    return [
      `Razón corriente: ${ratio(data.liquidez.razonCorriente)}`,
      `Prueba ácida: ${ratio(data.liquidez.pruebaAcida)}`,
      `Capital de trabajo: ${money(data.liquidez.capitalTrabajo)}`,
      `Nivel de endeudamiento: ${pct(data.endeudamiento.nivelEndeudamiento)}`,
      `Endeudamiento patrimonial: ${ratio(data.endeudamiento.endeudamientoPatrimonial)}`,
      `Margen bruto: ${pct(data.rentabilidad.margenBruto)}`,
      `Margen neto: ${pct(data.rentabilidad.margenNeto)}`,
      `ROA: ${pct(data.rentabilidad.roa)}`,
      `ROE: ${pct(data.rentabilidad.roe)}`,
    ].join("\n")
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const res = await fetch(`${apiBase}accounting/reports/financial-indicators`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const result = await res.json()
        setData(result?.data ?? null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Indicadores Financieros</h1>
          <p className="text-sm text-gray-500">Liquidez, endeudamiento y rentabilidad calculados en vivo</p>
        </div>
        {aiExplicar.enabled && data && (
          <AiSuggestButton label="Explicar con IA" prompt={aiExplicar.prompt} context={buildContext()} onResult={setAiExplanation} />
        )}
      </div>

      {aiExplanation && <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} color="blue" />}

      <div className="flex items-start gap-2 bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>El plan de cuentas colombiano estándar no separa corto y largo plazo con códigos distintos, así que el activo/pasivo &quot;corriente&quot; se aproxima por clase de cuenta (11-14 y 22-28). Úsalo como guía, no como dictamen contable formal.</p>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> Liquidez
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <IndicatorCard label="Razón Corriente" value={ratio(data.liquidez.razonCorriente)} hint="Activo corriente / Pasivo corriente. Ideal &gt; 1." tone={data.liquidez.razonCorriente !== null && data.liquidez.razonCorriente >= 1 ? "emerald" : "amber"} />
              <IndicatorCard label="Prueba Ácida" value={ratio(data.liquidez.pruebaAcida)} hint="(Activo corriente - Inventario) / Pasivo corriente." tone={data.liquidez.pruebaAcida !== null && data.liquidez.pruebaAcida >= 1 ? "emerald" : "amber"} />
              <IndicatorCard label="Capital de Trabajo" value={money(data.liquidez.capitalTrabajo)} hint="Activo corriente - Pasivo corriente." tone={data.liquidez.capitalTrabajo >= 0 ? "emerald" : "amber"} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Endeudamiento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <IndicatorCard label="Nivel de Endeudamiento" value={pct(data.endeudamiento.nivelEndeudamiento)} hint="Pasivo total / Activo total. Qué % de la empresa es de terceros." tone={data.endeudamiento.nivelEndeudamiento !== null && data.endeudamiento.nivelEndeudamiento <= 0.6 ? "emerald" : "amber"} />
              <IndicatorCard label="Endeudamiento Patrimonial" value={ratio(data.endeudamiento.endeudamientoPatrimonial)} hint="Pasivo total / Patrimonio." tone={data.endeudamiento.endeudamientoPatrimonial !== null && data.endeudamiento.endeudamientoPatrimonial <= 1.5 ? "emerald" : "amber"} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Rentabilidad
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <IndicatorCard label="Margen Bruto" value={pct(data.rentabilidad.margenBruto)} hint="Utilidad bruta / Ingresos." tone="blue" />
              <IndicatorCard label="Margen Neto" value={pct(data.rentabilidad.margenNeto)} hint="Utilidad neta / Ingresos." tone="blue" />
              <IndicatorCard label="ROA" value={pct(data.rentabilidad.roa)} hint="Utilidad neta / Activo total." tone="blue" />
              <IndicatorCard label="ROE" value={pct(data.rentabilidad.roe)} hint="Utilidad neta / Patrimonio." tone="blue" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
