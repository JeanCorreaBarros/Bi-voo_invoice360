"use client"

import { useEffect, useMemo, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Power, Search } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

const TAX_TYPES = ["IVA", "RETEFUENTE", "RETEICA", "RETEIVA", "ICA", "CONSUMO"]

type Account = { id: string; code: string; name: string }
type TaxRate = {
  id: string
  name: string
  type: string
  percentage: string
  accountId: string | null
  active: boolean
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const selectClass =
  "h-12 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  IVA: { label: "IVA", className: "bg-blue-50 text-blue-700 border-blue-100" },
  RETEFUENTE: { label: "Retefuente", className: "bg-amber-50 text-amber-700 border-amber-100" },
  RETEICA: { label: "ReteICA", className: "bg-purple-50 text-purple-700 border-purple-100" },
  RETEIVA: { label: "ReteIVA", className: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  ICA: { label: "ICA", className: "bg-pink-50 text-pink-700 border-pink-100" },
  CONSUMO: { label: "Consumo", className: "bg-teal-50 text-teal-700 border-teal-100" },
}

export default function ImpuestosPage() {
  const [items, setItems] = useState<TaxRate[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const emptyForm = { name: "", type: "IVA", percentage: "", accountId: "" }
  const [form, setForm] = useState(emptyForm)

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      (accounts.find(a => a.id === item.accountId)?.code || "").includes(q) ||
      (accounts.find(a => a.id === item.accountId)?.name || "").toLowerCase().includes(q)
    )
  }, [items, search, accounts])

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [taxRes, accRes] = await Promise.all([
        fetch(`${apiBase}accounting/tax-rates`, { headers: authHeaders() }),
        fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() }),
      ])
      const taxData = await taxRes.json()
      const accData = await accRes.json()
      setItems(taxData?.data ?? [])
      setAccounts((accData?.data ?? []).filter((a: any) => a.allowsEntries))
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar tarifas de impuestos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSave = async () => {
    if (!form.name || !form.type || form.percentage === "") {
      toast.error("Nombre, tipo y porcentaje son obligatorios")
      return
    }
    setSaving(true)
    try {
      const url = editingId ? `${apiBase}accounting/tax-rates/${editingId}` : `${apiBase}accounting/tax-rates`
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar")
        return
      }
      toast.success(editingId ? "Tarifa actualizada" : "Tarifa creada")
      setIsModalOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchAll()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: TaxRate) => {
    try {
      const endpoint = item.active ? "deactivate" : "activate"
      const res = await fetch(`${apiBase}accounting/tax-rates/${item.id}/${endpoint}`, {
        method: "PATCH",
        headers: authHeaders(),
      })
      if (!res.ok) {
        toast.error("Error al cambiar el estado")
        return
      }
      await fetchAll()
      toast.success(`Tarifa ${item.active ? "desactivada" : "activada"}`)
    } catch {
      toast.error("Error al cambiar el estado")
    }
  }

  return (
    <div className="w-full space-y-5">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración Tributaria</h1>
          <p className="text-sm text-gray-500">Catálogo de tarifas de IVA y retenciones</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar tarifa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[hsl(209,79%,35%)] outline-none text-sm w-full"
            />
          </div>
          <Button
            onClick={() => {
              setEditingId(null)
              setForm(emptyForm)
              setIsModalOpen(true)
            }}
            className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4" /> Nueva Tarifa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          No se encontraron tarifas
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Nombre</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Tipo</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Porcentaje</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Cuenta Contable</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => {
                const account = accounts.find((a) => a.id === item.accountId)
                const typeStyle = TYPE_STYLES[item.type] || { label: item.type, className: "bg-gray-50 text-gray-600 border-gray-100" }
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${typeStyle.className}`}>
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-[hsl(209,79%,35%)] text-right">{Number(item.percentage)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">
                            {account.code}
                          </span>
                          <span className="text-xs text-gray-600 font-semibold max-w-[220px] truncate" title={account.name}>
                            {account.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Sin cuenta asociada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.active ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.08)]"
                          onClick={() => {
                            setEditingId(item.id)
                            setForm({ name: item.name, type: item.type, percentage: String(item.percentage), accountId: item.accountId || "" })
                            setIsModalOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-lg ${
                            item.active
                              ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                              : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          onClick={() => handleToggle(item)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              {editingId ? "Editar Tarifa" : "Nueva Tarifa"}
            </DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tipo</Label>
                <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TAX_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Porcentaje</Label>
                <Input type="number" step="0.001" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} className="h-12 rounded-xl border-gray-200" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Cuenta contable (opcional)</Label>
              <select className={selectClass} value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Sin cuenta asociada</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50">
              {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
