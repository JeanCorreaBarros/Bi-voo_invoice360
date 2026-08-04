"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, CheckCircle2, AlertTriangle } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type BankAccount = { id: string; bankName: string; accountNumber: string }
type Reconciliation = {
  id: number
  statementDate: string
  statementBalance: string
  bookBalance: string
  difference: string
  status: "OPEN" | "CLOSED"
  note: string | null
}

type StatementLine = { date: string; description: string; amount: number }
type MatchResult = {
  totalStatementLines: number
  matchedCount: number
  unmatchedStatementCount: number
  unmatchedBookCount: number
  matched: { statementDate: string; statementDescription: string; statementAmount: number; entryNumber: number; entryDate: string; entryDescription: string | null }[]
  unmatchedStatement: { statementDate: string; statementDescription: string; statementAmount: number }[]
  unmatchedBook: { entryNumber: number; entryDate: string; entryDescription: string | null; amount: number }[]
}

// Parser simple de CSV: espera columnas fecha,descripcion,monto (con o sin
// encabezado). No intenta soportar CSV con comas dentro de campos citados —
// para un extracto bancario típico exportado del banco, esto es suficiente.
function parseStatementCsv(text: string): StatementLine[] {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
  const lines: StatementLine[] = []
  for (const row of rows) {
    const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    if (cols.length < 3) continue
    const [date, description, amountRaw] = cols
    const amount = Number(amountRaw.replace(/[^0-9.-]/g, ""))
    if (!date || Number.isNaN(amount)) continue
    if (Number.isNaN(new Date(date).getTime())) continue
    lines.push({ date, description, amount })
  }
  return lines
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number | string) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`
}

export default function ConciliacionPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [bankAccountId, setBankAccountId] = useState("")
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [statementBalance, setStatementBalance] = useState("")
  const [note, setNote] = useState("")

  const [importing, setImporting] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${apiBase}treasury/bank-accounts?active=true`, { headers: authHeaders() })
      const data = await res.json()
      setBankAccounts(data?.data ?? [])
    }
    load()
  }, [])

  const fetchReconciliations = async (id: string) => {
    if (!id) {
      setReconciliations([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}treasury/reconciliations?bankAccountId=${id}`, { headers: authHeaders() })
      const data = await res.json()
      setReconciliations(data?.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReconciliations(bankAccountId)
  }, [bankAccountId])

  const handleCreate = async () => {
    if (!bankAccountId || !statementBalance) {
      toast.error("Selecciona la cuenta e ingresa el saldo del extracto")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}treasury/reconciliations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ bankAccountId, statementDate, statementBalance: Number(statementBalance), note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al conciliar")
        return
      }
      toast.success(data.data.status === "CLOSED" ? "Conciliación cuadrada" : "Conciliación registrada con diferencia")
      setStatementBalance("")
      setNote("")
      await fetchReconciliations(bankAccountId)
    } catch {
      toast.error("Error al conciliar")
    } finally {
      setSaving(false)
    }
  }

  const handleImportFile = async (file: File) => {
    if (!bankAccountId) {
      toast.error("Selecciona primero una cuenta bancaria")
      return
    }
    setImporting(true)
    setMatchResult(null)
    try {
      const text = await file.text()
      const lines = parseStatementCsv(text)
      if (lines.length === 0) {
        toast.error("No se encontraron filas válidas en el archivo (se esperan columnas: fecha, descripción, monto)")
        return
      }
      const res = await fetch(`${apiBase}treasury/statement-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ bankAccountId, lines }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.message || "Error al importar el extracto")
      setMatchResult(data.data)
      toast.success(`${data.data.matchedCount} de ${data.data.totalStatementLines} movimientos cruzados automáticamente`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar el extracto")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
        <p className="text-sm text-gray-500">Compara el saldo del extracto contra el saldo contable a una fecha</p>
      </div>

      <select
        className="h-12 w-full sm:w-96 px-3 rounded-xl border border-gray-200 bg-white text-sm shadow-sm"
        value={bankAccountId}
        onChange={(e) => setBankAccountId(e.target.value)}
      >
        <option value="">Selecciona una cuenta bancaria...</option>
        {bankAccounts.map((b) => (
          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
        ))}
      </select>

      {bankAccountId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nueva conciliación</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Fecha del extracto</Label>
              <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Saldo del extracto</Label>
              <Input type="number" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nota (opcional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-xl border-gray-200" />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white rounded-xl disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-1" /> {saving ? "Conciliando..." : "Conciliar"}
          </Button>
        </div>
      )}

      {bankAccountId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Importar extracto (CSV) para conciliación mes a mes</p>
          <p className="text-xs text-gray-500">
            Archivo CSV con columnas: fecha, descripción, monto. Se cruza automáticamente contra tus comprobantes contables (tolerancia de {" "}
            {5} días y $1 de diferencia por redondeo).
          </p>
          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer w-fit">
            <Upload className="h-4 w-4" />
            {importing ? "Procesando..." : "Seleccionar archivo CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ""
              }}
            />
          </label>

          {matchResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-emerald-700">{matchResult.matchedCount}</p>
                  <p className="text-[11px] text-emerald-600 font-bold uppercase">Cruzados</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-amber-700">{matchResult.unmatchedStatementCount}</p>
                  <p className="text-[11px] text-amber-600 font-bold uppercase">Sin registro contable</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-red-700">{matchResult.unmatchedBookCount}</p>
                  <p className="text-[11px] text-red-600 font-bold uppercase">Sin soporte en extracto</p>
                </div>
              </div>

              {matchResult.unmatchedStatement.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Movimientos del extracto sin comprobante</p>
                  <div className="space-y-1">
                    {matchResult.unmatchedStatement.map((u, i) => (
                      <div key={i} className="flex justify-between text-xs bg-amber-50/60 rounded-lg px-3 py-1.5">
                        <span className="text-gray-600 truncate">{new Date(u.statementDate).toLocaleDateString("es-CO", { timeZone: "UTC" })} · {u.statementDescription}</span>
                        <span className="font-bold text-gray-800">{money(u.statementAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchResult.unmatchedBook.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Comprobantes sin respaldo en el extracto</p>
                  <div className="space-y-1">
                    {matchResult.unmatchedBook.map((u, i) => (
                      <div key={i} className="flex justify-between text-xs bg-red-50/60 rounded-lg px-3 py-1.5">
                        <span className="text-gray-600 truncate">Comprobante #{u.entryNumber} · {new Date(u.entryDate).toLocaleDateString("es-CO")} · {u.entryDescription}</span>
                        <span className="font-bold text-gray-800">{money(u.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchResult.matched.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cruzados correctamente</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {matchResult.matched.map((m, i) => (
                      <div key={i} className="flex justify-between text-xs bg-emerald-50/60 rounded-lg px-3 py-1.5">
                        <span className="text-gray-600 truncate">{m.statementDescription} → Comprobante #{m.entryNumber}</span>
                        <span className="font-bold text-gray-800">{money(m.statementAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {bankAccountId && (
        loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando historial...</div>
        ) : reconciliations.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Sin conciliaciones registradas</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Fecha", "Saldo Extracto", "Saldo Contable", "Diferencia", "Estado"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reconciliations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(r.statementDate).toLocaleDateString("es-CO")}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(r.statementBalance)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(r.bookBalance)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(r.difference)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === "CLOSED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {r.status === "CLOSED" ? "Cuadrada" : "Con diferencia"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
