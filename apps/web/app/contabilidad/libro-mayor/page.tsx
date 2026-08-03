"use client"

import { useEffect, useState } from "react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

// Debe coincidir con el prompt por defecto del catálogo en
// apps/web/app/configuracion/page.tsx (AI_EVENTS).
const DEFAULT_PROMPT_EXPLICACION_REPORTES =
  "Resume en lenguaje sencillo las cifras principales del reporte (Balance de Prueba, Balance General o Estado de Resultados) y explica las variaciones más relevantes."

type Account = { id: string; code: string; name: string }
type Movement = {
  date: string
  type: string
  number: number
  description: string | null
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

const selectClass =
  "h-11 w-full sm:w-96 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function LibroMayorPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [accountInfo, setAccountInfo] = useState<{ code: string; name: string } | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState("")

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_REPORTES)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() })
      const data = await res.json()
      const list = (data?.data ?? []).filter((a: any) => a.allowsEntries)
      setAccounts(list)
    }
    load()
  }, [])

  useEffect(() => {
    if (!accountId) {
      setMovements([])
      setAccountInfo(null)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}accounting/reports/ledger?accountId=${accountId}`, {
          headers: authHeaders(),
        })
        const data = await res.json()
        setAccountInfo(data?.data?.account ?? null)
        setMovements(data?.data?.movements ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    setAiExplanation("")
  }, [accountId])

  const buildLedgerContext = () => {
    if (!accountInfo) return ""
    const lastBalance = movements[movements.length - 1]?.balance ?? 0
    const totalDebit = movements.reduce((sum, m) => sum + m.debit, 0)
    const totalCredit = movements.reduce((sum, m) => sum + m.credit, 0)
    return `Libro Mayor de la cuenta ${accountInfo.code} - ${accountInfo.name}.\nMovimientos: ${movements.length}. Total débitos: ${money(totalDebit)}. Total créditos: ${money(totalCredit)}. Saldo actual: ${money(lastBalance)}.`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Libro Mayor</h1>
        <p className="text-sm text-gray-500">Movimientos cronológicos y saldo corriente por cuenta</p>
      </div>

      <select className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Selecciona una cuenta...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} - {a.name}
          </option>
        ))}
      </select>

      {!accountId ? (
        <div className="py-16 text-center text-gray-400 text-sm">Selecciona una cuenta para ver su libro mayor</div>
      ) : loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : movements.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">Esta cuenta no tiene movimientos todavía</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
            <span className="text-sm font-mono font-bold text-gray-700">
              {accountInfo?.code} - {accountInfo?.name}
            </span>
            {aiExplicar.enabled && (
              <AiSuggestButton
                label="Explicar con IA"
                prompt={aiExplicar.prompt}
                context={buildLedgerContext()}
                onResult={setAiExplanation}
              />
            )}
          </div>
          {aiExplanation && (
            <div className="px-5 pt-3">
              <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} />
            </div>
          )}
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Fecha", "Comprobante", "Descripción", "Débito", "Crédito", "Saldo"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(m.date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                      {m.type}-{m.number}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.description || "—"}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">
                      {m.debit > 0 ? money(m.debit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">
                      {m.credit > 0 ? money(m.credit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                      {money(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
