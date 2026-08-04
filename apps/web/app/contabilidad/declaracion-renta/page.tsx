"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Receipt } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

const DEFAULT_PROMPT =
  "Eres un asistente contable. A partir de las cifras contables anuales entregadas, redacta un BORRADOR ORIENTATIVO de declaración de renta para una pyme colombiana: resume ingresos brutos, costos y gastos deducibles, renta líquida gravable estimada y el impuesto estimado con la tarifa indicada. Explica claramente los supuestos y simplificaciones usadas. Deja explícito en la respuesta que este borrador NO es una declaración oficial, que no incluye la conciliación fiscal completa (diferencias entre renta contable y fiscal, rentas exentas, descuentos tributarios, etc.) y que debe ser revisado y ajustado por un contador o revisor fiscal antes de presentarse ante la DIAN."

type IncomeStatement = { totalIncome: number; totalCost: number; grossProfit: number; totalExpense: number; netIncome: number }

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Math.round(Number(n || 0)).toLocaleString("es-CO")}`
}

export default function DeclaracionRentaPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear - 1))
  const [tarifa, setTarifa] = useState("35")
  const [rentaExenta, setRentaExenta] = useState("0")
  const [income, setIncome] = useState<IncomeStatement | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")

  const aiEvent = useAiEvent("cont_borrador_declaracion_renta", DEFAULT_PROMPT)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setDraft("")
      try {
        const token = getToken()
        const from = `${year}-01-01`
        const to = `${year}-12-31`
        const res = await fetch(`${apiBase}accounting/reports/income-statement?from=${from}&to=${to}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const result = await res.json()
        setIncome(result?.data ?? null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year])

  const rentaLiquidaGravable = income ? Math.max(0, income.netIncome - Number(rentaExenta || 0)) : 0
  const impuestoEstimado = rentaLiquidaGravable * (Number(tarifa || 0) / 100)

  const buildContext = () => {
    if (!income) return ""
    return [
      `Año gravable: ${year}`,
      `Ingresos totales: ${money(income.totalIncome)}`,
      `Costo de ventas: ${money(income.totalCost)}`,
      `Utilidad bruta: ${money(income.grossProfit)}`,
      `Gastos totales: ${money(income.totalExpense)}`,
      `Utilidad neta contable: ${money(income.netIncome)}`,
      `Renta exenta / ingresos no constitutivos declarados por el usuario: ${money(Number(rentaExenta || 0))}`,
      `Renta líquida gravable estimada (utilidad neta - renta exenta, sin conciliación fiscal): ${money(rentaLiquidaGravable)}`,
      `Tarifa de renta aplicada: ${tarifa}%`,
      `Impuesto de renta estimado: ${money(impuestoEstimado)}`,
    ].join("\n")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gray-400" /> Declaración de Renta
        </h1>
        <p className="text-sm text-gray-500">Borrador orientativo con IA a partir de tus cifras contables</p>
      </div>

      <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs rounded-xl px-4 py-3 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Este borrador es solo una guía de referencia. NO es una declaración oficial ni reemplaza la conciliación
          fiscal (diferencias entre renta contable y fiscal, rentas exentas, descuentos tributarios, régimen
          aplicable, etc.). Debe ser revisado y ajustado por un contador o revisor fiscal antes de presentarse ante
          la DIAN. Bi360 no presenta declaraciones ante la DIAN.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Año gravable</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="h-11 rounded-xl border-gray-200" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tarifa de renta (%)</Label>
            <Input type="number" value={tarifa} onChange={(e) => setTarifa(e.target.value)} className="h-11 rounded-xl border-gray-200" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Renta exenta (opcional)</Label>
            <Input type="number" value={rentaExenta} onChange={(e) => setRentaExenta(e.target.value)} className="h-11 rounded-xl border-gray-200" />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          La tarifa general de renta para sociedades y la definición de rentas exentas dependen del régimen tributario de tu empresa — confírmalas con tu contador antes de usarlas.
        </p>
      </div>

      {loading || !income ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando cifras del año {year}...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumen {year}</p>
          <div className="divide-y divide-gray-50">
            {[
              ["Ingresos totales", income.totalIncome],
              ["Costo de ventas", -income.totalCost],
              ["Utilidad bruta", income.grossProfit],
              ["Gastos totales", -income.totalExpense],
              ["Utilidad neta contable", income.netIncome],
              ["Renta exenta declarada", -Number(rentaExenta || 0)],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between px-1 py-2 text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{money(value as number)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-1 py-2.5 text-sm font-bold bg-gray-50 rounded-lg mt-1">
              <span>Renta líquida gravable estimada</span>
              <span>{money(rentaLiquidaGravable)}</span>
            </div>
            <div className="flex items-center justify-between px-1 py-2.5 text-sm font-bold text-red-600">
              <span>Impuesto de renta estimado ({tarifa}%)</span>
              <span>{money(impuestoEstimado)}</span>
            </div>
          </div>

          {aiEvent.enabled && (
            <div className="pt-2">
              <AiSuggestButton label="Generar borrador con IA" prompt={aiEvent.prompt} context={buildContext()} onResult={setDraft} />
            </div>
          )}
        </div>
      )}

      {draft && (
        <div className="space-y-2">
          <AiResultPanel text={draft} onClose={() => setDraft("")} color="purple" />
          <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Recuerda: este borrador debe ser revisado por un contador o revisor fiscal antes de presentarse.</p>
          </div>
        </div>
      )}
    </div>
  )
}
