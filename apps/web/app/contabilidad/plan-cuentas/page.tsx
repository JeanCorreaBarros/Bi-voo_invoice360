"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Power, Hash, Search, ChevronLeft, ChevronRight } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

const ACCOUNT_TYPES = [
  { value: "ASSET", label: "Activo" },
  { value: "LIABILITY", label: "Pasivo" },
  { value: "EQUITY", label: "Patrimonio" },
  { value: "INCOME", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "COST", label: "Costo" },
]

type Account = {
  id: string
  code: string
  name: string
  type: string
  nature: "DEBIT" | "CREDIT"
  level: number
  parentId: string | null
  allowsEntries: boolean
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

const PAGE_SIZE = 25

export default function PlanCuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const emptyForm = {
    code: "",
    name: "",
    type: "ASSET",
    nature: "DEBIT" as "DEBIT" | "CREDIT",
    level: 3,
    parentId: "",
    allowsEntries: true,
  }
  const [form, setForm] = useState(emptyForm)

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/accounts`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      setAccounts(data?.data ?? [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar el plan de cuentas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const filteredAccounts = accounts.filter((a) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE))
  const pagedAccounts = filteredAccounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error("Código y nombre son obligatorios")
      return
    }

    setSaving(true)
    try {
      const token = getToken()
      const url = editingId
        ? `${apiBase}accounting/accounts/${editingId}`
        : `${apiBase}accounting/accounts`
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar la cuenta")
        return
      }

      toast.success(editingId ? "Cuenta actualizada" : "Cuenta creada")
      setIsModalOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchAccounts()
    } catch {
      toast.error("Error al guardar la cuenta")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (account: Account) => {
    try {
      const token = getToken()
      const endpoint = account.active ? "deactivate" : "activate"
      const res = await fetch(`${apiBase}accounting/accounts/${account.id}/${endpoint}`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok) {
        toast.error("Error al cambiar el estado")
        return
      }
      await fetchAccounts()
      toast.success(`Cuenta ${account.active ? "desactivada" : "activada"}`)
    } catch {
      toast.error("Error al cambiar el estado")
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Plan de Cuentas</h1>
          <p className="text-sm text-gray-500">PUC de tu empresa — clases, grupos y cuentas</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setForm(emptyForm)
            setIsModalOpen(true)
          }}
          className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Nueva Cuenta
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="h-11 pl-11 rounded-xl border-gray-200 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando plan de cuentas...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No se encontraron cuentas para "{search}"</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Código", "Nombre", "Tipo", "Naturaleza", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedAccounts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{a.code}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap" style={{ paddingLeft: `${(a.level - 1) * 16 + 20}px` }}>
                    {a.name}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {a.nature === "DEBIT" ? "Débito" : "Crédito"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-3 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.08)]"
                      title="Editar cuenta"
                      onClick={() => {
                        setEditingId(a.id)
                        setForm({
                          code: a.code,
                          name: a.name,
                          type: a.type,
                          nature: a.nature,
                          level: a.level,
                          parentId: a.parentId || "",
                          allowsEntries: a.allowsEntries,
                        })
                        setIsModalOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-lg ${a.active ? "text-green-600 hover:bg-red-50 hover:text-red-500" : "text-gray-400 hover:bg-green-50 hover:text-green-600"}`}
                      title={a.active ? "Desactivar" : "Activar"}
                      onClick={() => handleToggle(a)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              {filteredAccounts.length} cuenta{filteredAccounts.length !== 1 ? "s" : ""}
              {search ? ` (filtradas de ${accounts.length})` : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-gray-500 disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-gray-500 disabled:opacity-30"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[94dvh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              {editingId ? "Editar Cuenta" : "Nueva Cuenta"}
            </DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Código</Label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="h-12 pl-11 rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nivel</Label>
                <select
                  className={selectClass}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                >
                  <option value={1}>1 - Clase</option>
                  <option value={2}>2 - Grupo</option>
                  <option value={3}>3 - Cuenta</option>
                  <option value={4}>4 - Subcuenta</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Cuenta padre (opcional)</Label>
              <select
                className={selectClass}
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">Sin padre (clase raíz)</option>
                {accounts
                  .filter((a) => !editingId || a.id !== editingId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tipo</Label>
                <select
                  className={selectClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Naturaleza</Label>
                <select
                  className={selectClass}
                  value={form.nature}
                  onChange={(e) => setForm({ ...form, nature: e.target.value as "DEBIT" | "CREDIT" })}
                >
                  <option value="DEBIT">Débito</option>
                  <option value="CREDIT">Crédito</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={form.allowsEntries}
                onChange={(e) => setForm({ ...form, allowsEntries: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Permite movimientos directos (marcar solo para cuentas, no clases/grupos)
            </label>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Cuenta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
