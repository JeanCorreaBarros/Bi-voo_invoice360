"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

// Debe coincidir con el prompt por defecto del catálogo en
// apps/web/app/configuracion/page.tsx (AI_EVENTS).
const DEFAULT_PROMPT_EXPLICACION_REPORTES =
  "Resume en lenguaje sencillo las cifras principales del reporte (Balance de Prueba, Balance General o Estado de Resultados) y explica las variaciones más relevantes."

type TrialBalanceRow = {
  accountId: string
  code: string
  name: string
  nature: "DEBIT" | "CREDIT"
  debit: number
  credit: number
  balance: number
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

export default function ReportesPage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [aiExplanation, setAiExplanation] = useState("")

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_REPORTES)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const res = await fetch(`${apiBase}accounting/reports/trial-balance`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const data = await res.json()
        setRows(data?.data ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0)
  const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0)

  const buildReportContext = () => {
    const active = rows.filter((r) => r.debit > 0 || r.credit > 0)
    const lines = active.map((r) => `${r.code} ${r.name}: débito ${money(r.debit)}, crédito ${money(r.credit)}, saldo ${money(r.balance)}`)
    return `Balance de Prueba.\nTotal débitos: ${money(totalDebit)}. Total créditos: ${money(totalCredit)}.\n${lines.join("\n")}`
  }

  const handleExport = async () => {
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/reports/trial-balance/export/excel`, {
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
      a.download = "balance_de_prueba.xlsx"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al exportar el reporte")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Balance de Prueba</h1>
          <p className="text-sm text-gray-500">Saldos acumulados por cuenta</p>
        </div>
        <div className="flex items-center gap-2">
          {aiExplicar.enabled && !loading && rows.length > 0 && (
            <AiSuggestButton
              label="Explicar con IA"
              prompt={aiExplicar.prompt}
              context={buildReportContext()}
              onResult={setAiExplanation}
            />
          )}
          <Button variant="ghost" size="sm" onClick={handleExport} className="rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {aiExplanation && <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} />}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Calculando balance...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Código", "Cuenta", "Débitos", "Créditos", "Saldo"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows
                .filter((r) => r.debit > 0 || r.credit > 0)
                .map((row) => (
                  <tr key={row.accountId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{row.code}</td>
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{row.name}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{money(row.debit)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{money(row.credit)}</td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">{money(row.balance)}</td>
                  </tr>
                ))}
              {rows.every((r) => r.debit === 0 && r.credit === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                    Aún no hay movimientos registrados
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100 font-bold text-sm">
                <td className="px-5 py-3" colSpan={2}>Total</td>
                <td className="px-5 py-3 text-right">{money(totalDebit)}</td>
                <td className="px-5 py-3 text-right">{money(totalCredit)}</td>
                <td className="px-5 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
