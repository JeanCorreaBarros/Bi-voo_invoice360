"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, Sparkles, Loader2, Table2, LayoutList } from "lucide-react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"
import {
  ComparativeTable,
  flattenSection,
  defaultYearRange,
  yearsBetween,
  type FlatRow,
  type ComparativeSection,
} from "@/components/comparative-financial-table"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

// Deben coincidir con los prompts por defecto del catálogo en
// apps/web/app/configuracion/page.tsx (AI_EVENTS).
const DEFAULT_PROMPT_EXPLICACION_REPORTES =
  "Resume en lenguaje sencillo las cifras principales del reporte (Balance de Prueba, Balance General o Estado de Resultados) y explica las variaciones más relevantes."
const DEFAULT_PROMPT_ANALISIS_FINANCIERO =
  "Explica en lenguaje natural las variaciones en utilidad, cartera o márgenes comparando el período actual con el anterior."

type Row = { accountId: string; code: string; name: string; balance: number }
type IncomeStatement = {
  income: Row[]
  cost: Row[]
  expense: Row[]
  totalIncome: number
  totalCost: number
  grossProfit: number
  totalExpense: number
  netIncome: number
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

type IncomeStatementComparative = {
  years: number[]
  ingresos: ComparativeSection | null
  costo: ComparativeSection | null
  gastos: ComparativeSection | null
  grossProfitByYear: Record<string, number>
  netIncomeByYear: Record<string, number>
}

function buildIncomeComparativeRows(compData: IncomeStatementComparative): FlatRow[] {
  const rows: FlatRow[] = [...flattenSection(compData.ingresos), ...flattenSection(compData.costo)]
  rows.push({ key: "utilidad-bruta", label: "Utilidad Bruta", indent: 0, bold: true, tone: "info", values: compData.grossProfitByYear })
  rows.push(...flattenSection(compData.gastos))
  rows.push({ key: "utilidad-neta", label: "Utilidad Neta", indent: 0, bold: true, tone: "success", values: compData.netIncomeByYear })
  return rows
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

export default function EstadoResultadosPage() {
  const [data, setData] = useState<IncomeStatement | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [aiExplanation, setAiExplanation] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [analyzingIA, setAnalyzingIA] = useState(false)

  const [comparative, setComparative] = useState(false)
  const [compData, setCompData] = useState<IncomeStatementComparative | null>(null)
  const [compLoading, setCompLoading] = useState(false)
  const defaultRange = defaultYearRange(5)
  const [fromYear, setFromYear] = useState(defaultRange.from)
  const [toYear, setToYear] = useState(defaultRange.to)

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_REPORTES)
  const aiAnalisis = useAiEvent("cont_analisis_financiero", DEFAULT_PROMPT_ANALISIS_FINANCIERO)

  const loadComparative = async () => {
    const years = yearsBetween(fromYear, toYear)
    if (years.length === 0) {
      toast.error("Rango de años inválido")
      return
    }
    setCompLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/reports/income-statement/comparative?years=${years.join(",")}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const result = await res.json()
      setCompData(result?.data ?? null)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar el comparativo")
    } finally {
      setCompLoading(false)
    }
  }

  useEffect(() => {
    if (comparative && !compData) loadComparative()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparative])

  const load = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`${apiBase}accounting/reports/income-statement?${params.toString()}`, {
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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      const token = getToken()
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`${apiBase}accounting/reports/income-statement/export/${format}?${params.toString()}`, {
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
      a.download = `estado_de_resultados.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al exportar el reporte")
    }
  }

  const buildReportContext = () => {
    if (!data) return ""
    return [
      "Estado de Resultados.",
      `Ingresos: ${money(data.totalIncome)}. Costo de ventas: ${money(data.totalCost)}. Utilidad bruta: ${money(data.grossProfit)}.`,
      `Gastos: ${money(data.totalExpense)}. Utilidad neta: ${money(data.netIncome)}.`,
    ].join("\n")
  }

  // Calcula el rango inmediatamente anterior con la misma duración que
  // from–to, para poder comparar el período actual contra el anterior.
  const buildPreviousRange = () => {
    if (!from || !to) return null
    const start = new Date(from)
    const end = new Date(to)
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days + 1)
    return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) }
  }

  const analizarConIA = async () => {
    if (!data || analyzingIA) return
    setAnalyzingIA(true)
    try {
      const token = getToken()
      let prevData: IncomeStatement | null = null
      const prevRange = buildPreviousRange()
      if (prevRange) {
        const params = new URLSearchParams({ from: prevRange.from, to: prevRange.to })
        const res = await fetch(`${apiBase}accounting/reports/income-statement?${params.toString()}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const result = await res.json()
        prevData = result?.data ?? null
      }

      const context = [
        `Período actual: ingresos ${money(data.totalIncome)}, costo de ventas ${money(data.totalCost)}, utilidad bruta ${money(data.grossProfit)}, gastos ${money(data.totalExpense)}, utilidad neta ${money(data.netIncome)}.`,
        prevData
          ? `Período anterior comparable: ingresos ${money(prevData.totalIncome)}, costo de ventas ${money(prevData.totalCost)}, utilidad bruta ${money(prevData.grossProfit)}, gastos ${money(prevData.totalExpense)}, utilidad neta ${money(prevData.netIncome)}.`
          : "No hay un período anterior comparable disponible (define un rango de fechas 'Desde/Hasta' primero).",
      ].join("\n")

      const chatRes = await fetch(`${apiBase}ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `${aiAnalisis.prompt}\n\nDatos:\n${context}\n\nResponde breve y directo.` }],
        }),
      })
      const chatResult = await chatRes.json()
      if (!chatRes.ok || !chatResult.ok) throw new Error(chatResult?.message || "Error al consultar la IA")
      setAiAnalysis(chatResult.data.reply || "")
    } catch (e) {
      setAiAnalysis(e instanceof Error ? `No se pudo consultar la IA: ${e.message}` : "No se pudo consultar la IA")
    } finally {
      setAnalyzingIA(false)
    }
  }

  return (
    <div className={`${comparative ? "max-w-7xl" : "max-w-4xl"} mx-auto space-y-5`}>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Estado de Resultados</h1>
          <p className="text-sm text-gray-500">
            {comparative ? "Comparativo por años" : "Ingresos, costos y gastos del periodo"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {aiExplicar.enabled && data && !comparative && (
            <AiSuggestButton
              label="Explicar con IA"
              prompt={aiExplicar.prompt}
              context={buildReportContext()}
              onResult={setAiExplanation}
            />
          )}
          {aiAnalisis.enabled && data && !comparative && (
            <Button variant="outline" size="sm" disabled={analyzingIA} onClick={analizarConIA}>
              {analyzingIA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="ml-1.5">{analyzingIA ? "Analizando..." : "Análisis financiero IA"}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setComparative((v) => !v)}
            className="rounded-lg flex items-center gap-1.5"
          >
            {comparative ? <LayoutList className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            {comparative ? "Vista de un período" : "Vista comparativa"}
          </Button>
          {!comparative && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleExport("excel")} className="rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExport("pdf")} className="rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {aiExplanation && <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} />}
      {aiAnalysis && <AiResultPanel text={aiAnalysis} onClose={() => setAiAnalysis("")} color="purple" />}

      {comparative ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Desde año</Label>
              <Input
                type="number"
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className="h-10 w-28 rounded-xl border-gray-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Hasta año</Label>
              <Input
                type="number"
                value={toYear}
                onChange={(e) => setToYear(Number(e.target.value))}
                className="h-10 w-28 rounded-xl border-gray-200"
              />
            </div>
            <button
              onClick={loadComparative}
              className="h-10 px-4 rounded-xl bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white text-sm font-semibold"
            >
              Actualizar
            </button>
          </div>

          {compLoading || !compData ? (
            <div className="py-16 text-center text-gray-400 text-sm">{compLoading ? "Cargando..." : "Sin datos"}</div>
          ) : (
            <ComparativeTable years={compData.years} money={money} rows={buildIncomeComparativeRows(compData)} />
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Desde</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Hasta</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-xl border-gray-200" />
            </div>
            <button
              onClick={load}
              className="h-11 px-4 rounded-xl bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white text-sm font-semibold"
            >
              Filtrar
            </button>
          </div>

          {loading || !data ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <Section title="Ingresos" rows={data.income} total={data.totalIncome} />
              <Section title="Costo de Ventas" rows={data.cost} total={data.totalCost} />

              <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold bg-blue-50 text-blue-700">
                <span>Utilidad Bruta</span>
                <span>{money(data.grossProfit)}</span>
              </div>

              <Section title="Gastos" rows={data.expense} total={data.totalExpense} />

              <div
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold ${
                  data.netIncome >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}
              >
                <span>Utilidad Neta</span>
                <span>{money(data.netIncome)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
