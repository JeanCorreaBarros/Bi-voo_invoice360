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

type Party = { id: string; name: string; nit: string | null }
type CustomerRow = { invoiceId: number; orderPrefix: string; orderId: number; date: string; total: number; paid: number; balance: number; status: string }
type SupplierRow = { purchaseId: number; invoiceNumber: string | null; date: string; total: number; paid: number; balance: number; status: string }

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
  "h-11 w-full sm:w-80 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function EstadosCuentaPage() {
  const [mode, setMode] = useState<"customer" | "supplier">("customer")
  const [parties, setParties] = useState<Party[]>([])
  const [nit, setNit] = useState("")
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([])
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState("")
  const [selectedPartyName, setSelectedPartyName] = useState("")

  const aiExplicar = useAiEvent("cont_explicacion_reportes", DEFAULT_PROMPT_EXPLICACION_REPORTES)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  useEffect(() => {
    const load = async () => {
      const endpoint = mode === "customer" ? "customers" : "suppliers"
      const res = await fetch(`${apiBase}${endpoint}`, { headers: authHeaders() })
      const data = await res.json()
      setParties(Array.isArray(data) ? data : data?.data ?? [])
      setNit("")
      setCustomerRows([])
      setSupplierRows([])
    }
    load()
  }, [mode])

  useEffect(() => {
    if (!nit) return
    setAiExplanation("")
    setSelectedPartyName(parties.find((p) => p.nit === nit)?.name || "")
    const load = async () => {
      setLoading(true)
      try {
        const endpoint = mode === "customer" ? "customer-statement" : "supplier-statement"
        const res = await fetch(`${apiBase}accounting/reports/${endpoint}?nit=${encodeURIComponent(nit)}`, {
          headers: authHeaders(),
        })
        const data = await res.json()
        if (mode === "customer") {
          setCustomerRows(data?.data?.invoices ?? [])
        } else {
          setSupplierRows(data?.data?.purchases ?? [])
        }
        setTotalBalance(data?.data?.totalBalance ?? 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nit, mode])

  const buildStatementContext = () => {
    const label = mode === "customer" ? "cliente" : "proveedor"
    const rowsText =
      mode === "customer"
        ? customerRows.map((r) => `${r.orderPrefix}-${r.orderId}: total ${money(r.total)}, pagado ${money(r.paid)}, saldo ${money(r.balance)} (${r.status})`).join("\n")
        : supplierRows.map((r) => `${r.invoiceNumber || `#${r.purchaseId}`}: total ${money(r.total)}, pagado ${money(r.paid)}, saldo ${money(r.balance)} (${r.status})`).join("\n")
    return `Estado de cuenta del ${label} ${selectedPartyName} (NIT ${nit}).\nSaldo total pendiente: ${money(totalBalance)}.\n${rowsText}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Estados de Cuenta</h1>
        <p className="text-sm text-gray-500">Movimientos y saldo pendiente por cliente o proveedor</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("customer")}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${mode === "customer" ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500"}`}
        >
          Clientes
        </button>
        <button
          onClick={() => setMode("supplier")}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${mode === "supplier" ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500"}`}
        >
          Proveedores
        </button>
      </div>

      <select className={selectClass} value={nit} onChange={(e) => setNit(e.target.value)}>
        <option value="">Selecciona {mode === "customer" ? "un cliente" : "un proveedor"}...</option>
        {parties.filter((p) => p.nit).map((p) => (
          <option key={p.id} value={p.nit!}>{p.name} ({p.nit})</option>
        ))}
      </select>

      {!nit ? (
        <div className="py-16 text-center text-gray-400 text-sm">Selecciona {mode === "customer" ? "un cliente" : "un proveedor"} para ver su estado de cuenta</div>
      ) : loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {aiExplicar.enabled && (
            <div className="flex items-center justify-between gap-3">
              <AiSuggestButton
                label="Explicar con IA"
                prompt={aiExplicar.prompt}
                context={buildStatementContext()}
                onResult={setAiExplanation}
              />
            </div>
          )}
          {aiExplanation && <AiResultPanel text={aiExplanation} onClose={() => setAiExplanation("")} />}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[mode === "customer" ? "Factura" : "Compra", "Fecha", "Total", "Pagado", "Saldo", "Estado"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mode === "customer"
                  ? customerRows.map((r) => (
                      <tr key={r.invoiceId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{r.orderPrefix}-{r.orderId}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(r.date).toLocaleDateString("es-CO")}</td>
                        <td className="px-5 py-3 text-sm text-right whitespace-nowrap">{money(r.total)}</td>
                        <td className="px-5 py-3 text-sm text-right whitespace-nowrap">{money(r.paid)}</td>
                        <td className="px-5 py-3 text-sm text-right font-semibold whitespace-nowrap">{money(r.balance)}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{r.status}</td>
                      </tr>
                    ))
                  : supplierRows.map((r) => (
                      <tr key={r.purchaseId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{r.invoiceNumber || `#${r.purchaseId}`}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(r.date).toLocaleDateString("es-CO")}</td>
                        <td className="px-5 py-3 text-sm text-right whitespace-nowrap">{money(r.total)}</td>
                        <td className="px-5 py-3 text-sm text-right whitespace-nowrap">{money(r.paid)}</td>
                        <td className="px-5 py-3 text-sm text-right font-semibold whitespace-nowrap">{money(r.balance)}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{r.status}</td>
                      </tr>
                    ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-100 font-bold text-sm">
                  <td className="px-5 py-3" colSpan={4}>Saldo total pendiente</td>
                  <td className="px-5 py-3 text-right">{money(totalBalance)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
