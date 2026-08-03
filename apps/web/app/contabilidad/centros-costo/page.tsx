"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Power, Hash } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type CostCenter = {
  id: string
  code: string
  name: string
  active: boolean
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

export default function CentrosCostoPage() {
  const [items, setItems] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { code: "", name: "" }
  const [form, setForm] = useState(emptyForm)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/cost-centers`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      setItems(data?.data ?? [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar centros de costo")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error("Código y nombre son obligatorios")
      return
    }

    setSaving(true)
    try {
      const token = getToken()
      const url = editingId
        ? `${apiBase}accounting/cost-centers/${editingId}`
        : `${apiBase}accounting/cost-centers`
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar")
        return
      }

      toast.success(editingId ? "Centro de costo actualizado" : "Centro de costo creado")
      setIsModalOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchItems()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: CostCenter) => {
    try {
      const token = getToken()
      const endpoint = item.active ? "deactivate" : "activate"
      const res = await fetch(`${apiBase}accounting/cost-centers/${item.id}/${endpoint}`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok) {
        toast.error("Error al cambiar el estado")
        return
      }
      await fetchItems()
      toast.success(`Centro de costo ${item.active ? "desactivado" : "activado"}`)
    } catch {
      toast.error("Error al cambiar el estado")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centros de Costo</h1>
          <p className="text-sm text-gray-500">Agrupa comprobantes por área o proyecto</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setForm(emptyForm)
            setIsModalOpen(true)
          }}
          className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay centros de costo todavía</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Código", "Nombre", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{item.code}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{item.name}</td>
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
                        setForm({ code: item.code, name: item.name })
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              {editingId ? "Editar Centro de Costo" : "Nuevo Centro de Costo"}
            </DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-4">
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
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
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
              {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
