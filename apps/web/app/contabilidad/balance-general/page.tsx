"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText } from "lucide-react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

// Debe coincidir con el prompt por defecto del catálogo en
// apps/web/app/configuracion/page.tsx (AI_EVENTS).
const DEFAULT_PROMPT_EXPLICACION_REPORTES =
  "Resume en lenguaje sencillo las cifras principales del reporte (Balance de Prueba, Balance General o Estado de Resultados) y explica las variaciones más relevantes."

type Row = { accountId: string; code: string; name: string; balance: number }
type BalanceSheet = {
  assets: Row[]
  liabilities: Row[]
  equity: Row[]
  totalAssets: number
  totalLiabilities: number
  equityFromAccounts: number
  netIncome: number
  totalEquity: number
  totalLiabilitiesAndEquity: number
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

function Section({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">Sin movimientos</div>
        ) : (
          rows.map((r) => (
            <div key={r.accountId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-gray-700">
                <span className="font-mono text-gray-400 mr-2">{r.code}</span>
                {r.name}
              </span>
              <span className="font-medium text-gray-900">{money(r.balance)}</span>
            </div>
          ))
        )}
        <div className="flex items-center justify-between px-4 py-2.5 text-sm font-bold bg-gray-50">
          <span>Total {title}</span>
          <span>{money(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default function BalanceGeneralPage() {
  const [data, setData] = useState<BalanceSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiExplanation, setAiExplanation] = useState("")

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_REPORTES)

  const buildReportContext = () => {
    if (!data) return ""
    const fmt = (rows: Row[]) => rows.map((r) => `${r.code} ${r.name}: ${money(r.balance)}`).join("\n")
    return [
      "Balance General.",
      `Activo total: ${money(data.totalAssets)}.`,
      `Pasivo total: ${money(data.totalLiabilities)}.`,
      `Patrimonio total: ${money(data.totalEquity)} (utilidad del ejercicio: ${money(data.netIncome)}).`,
      "Activos:", fmt(data.assets),
      "Pasivos:", fmt(data.liabilities),
      "Patrimonio:", fmt(data.equity),
    ].join("\n")
  }

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/reports/balance-sheet/export/${format}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok) {
        toast.error("Error al exportar el reporte")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `balance_general.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al exportar el reporte")
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const res = await fetch(`${apiBase}accounting/reports/balance-sheet`, {
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

  const balanced = data ? Math.round(data.totalAssets * 100) === Math.round(data.totalLiabilitiesAndEquity * 100) : false

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Balance General</h1>
          <p className="text-sm text-gray-500">Estado de Situación Financiera a la fecha</p>
        </div>
        <div className="flex items-center gap-2">
          {aiExplicar.enabled && data && (
            <AiSuggestButton
              label="Explicar con IA"
              prompt={aiExplicar.prompt}
              context={buildReportContext()}
              onResult={setAiExplanation}
            />
          )}
          <Button variant="ghost" size="sm" onClick={() => handleExport("excel")} className="rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport("pdf")} className="rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {aiExplanation && <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} />}

      {loading || !data ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <Section title="Activo" rows={data.assets} total={data.totalAssets} />
          <Section title="Pasivo" rows={data.liabilities} total={data.totalLiabilities} />

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Patrimonio</p>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {data.equity.map((r) => (
                <div key={r.accountId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-700">
                    <span className="font-mono text-gray-400 mr-2">{r.code}</span>
                    {r.name}
                  </span>
                  <span className="font-medium text-gray-900">{money(r.balance)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-700">Utilidad del ejercicio (calculada en vivo)</span>
                <span className="font-medium text-gray-900">{money(data.netIncome)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm font-bold bg-gray-50">
                <span>Total Patrimonio</span>
                <span>{money(data.totalEquity)}</span>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold ${balanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            <span>Activo: {money(data.totalAssets)} · Pasivo + Patrimonio: {money(data.totalLiabilitiesAndEquity)}</span>
            <span>{balanced ? "Cuadra ✓" : "No cuadra"}</span>
          </div>
        </div>
      )}
    </div>
  )
}
