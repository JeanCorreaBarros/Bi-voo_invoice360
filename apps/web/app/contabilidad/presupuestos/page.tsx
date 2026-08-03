"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

type Account = { id: string; code: string; name: string }
type BudgetExecutionRow = {
  id: string
  accountId: string
  code: string
  name: string
  type: string
  budgeted: number
  actual: number
  variance: number
  pct: number | null
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

const selectClass =
  "h-12 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function PresupuestosPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<BudgetExecutionRow[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const emptyForm = { accountId: "", budgetedAmount: "" }
  const [form, setForm] = useState(emptyForm)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [execRes, accRes] = await Promise.all([
        fetch(`${apiBase}accounting/budgets/execution?year=${year}&month=${month}`, { headers: authHeaders() }),
        fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() }),
      ])
      const execData = await execRes.json()
      const accData = await accRes.json()
      setRows(execData?.data ?? [])
      setAccounts((accData?.data ?? []).filter((a: any) => a.allowsEntries))
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar presupuestos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [year, month])

  const handleSave = async () => {
    if (!form.accountId || form.budgetedAmount === "") {
      toast.error("Selecciona una cuenta e ingresa el monto presupuestado")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}accounting/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...form, year, month }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar")
        return
      }
      toast.success("Presupuesto guardado")
      setIsModalOpen(false)
      setForm(emptyForm)
      await fetchAll()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}accounting/budgets/${id}`, { method: "DELETE", headers: authHeaders() })
      if (!res.ok) {
        toast.error("Error al eliminar")
        return
      }
      toast.success("Presupuesto eliminado")
      await fetchAll()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-sm text-gray-500">Ejecución presupuestal por cuenta y mes</p>
        </div>
        <div className="flex items-center gap-2">
          <select className={`${selectClass} w-40`} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-12 w-24 rounded-xl border-gray-200" />
          <Button
            onClick={() => { setForm(emptyForm); setIsModalOpen(true) }}
            className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay presupuestos para {MONTHS[month - 1]} {year}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Cuenta", "Presupuestado", "Real", "Variación", "% Ejecución", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{r.code} - {r.name}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{money(r.budgeted)}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(r.actual)}</td>
                  <td className={`px-5 py-3 text-sm text-right font-semibold whitespace-nowrap ${r.variance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {r.variance > 0 ? "+" : ""}{money(r.variance)}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-gray-500 whitespace-nowrap">{r.pct !== null ? `${r.pct}%` : "—"}</td>
                  <td className="px-5 py-3">
                    <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100 font-bold">
                <td className="px-5 py-3 text-sm text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm text-right text-gray-900">{money(totalBudgeted)}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-900">{money(totalActual)}</td>
                <td className="px-5 py-3" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              Presupuesto — {MONTHS[month - 1]} {year}
            </DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Cuenta</Label>
              <select className={selectClass} value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Selecciona una cuenta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Monto presupuestado</Label>
              <Input type="number" value={form.budgetedAmount} onChange={(e) => setForm({ ...form, budgetedAmount: e.target.value })} className="h-12 rounded-xl border-gray-200" />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
