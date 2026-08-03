"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

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
