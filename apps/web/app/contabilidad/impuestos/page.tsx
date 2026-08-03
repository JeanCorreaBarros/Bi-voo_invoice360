"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Power } from "lucide-react"

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

export default function ImpuestosPage() {
  const [items, setItems] = useState<TaxRate[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { name: "", type: "IVA", percentage: "", accountId: "" }
  const [form, setForm] = useState(emptyForm)

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
    <div className="max-w-4xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración Tributaria</h1>
          <p className="text-sm text-gray-500">Catálogo de tarifas de IVA y retenciones</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setForm(emptyForm)
            setIsModalOpen(true)
          }}
          className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Nueva Tarifa
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay tarifas registradas</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Nombre", "Tipo", "Porcentaje", "Cuenta", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const account = accounts.find((a) => a.id === item.accountId)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{item.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{item.type}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{Number(item.percentage)}%</td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{account ? `${account.code} - ${account.name}` : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.08)]"
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
                        className={`rounded-lg ${item.active ? "text-green-600 hover:bg-red-50 hover:text-red-500" : "text-gray-400 hover:bg-green-50 hover:text-green-600"}`}
                        onClick={() => handleToggle(item)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
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
