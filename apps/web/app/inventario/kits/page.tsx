"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Plus, PackagePlus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Product = { id: string; name: string; sku: string; type: string; stock: number; cost: number | null; unit: string | null }
type KitComponent = { id: string; componentProductId: string; quantity: number; componentProduct: { id: string; name: string; sku: string; unit: string | null; stock: number; cost: number | null } }
type Kit = { id: string; name: string; sku: string; price: number; components: KitComponent[] }

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-CO")}`
}

function CreateKitDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", sku: "", price: "" })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.price) {
      toast.error("Nombre, SKU y precio son obligatorios")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ name: form.name, sku: form.sku, type: "KIT", price: Number(form.price), stock: 0 }),
      })
      if (!res.ok) throw new Error("No se pudo crear el kit")
      toast.success("Kit creado — ahora agrégale sus componentes")
      setForm({ name: "", sku: "", price: "" })
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el kit")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nuevo Kit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Kit / Combo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Combo Desayuno" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="KIT-001" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Precio de Venta</Label>
            <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {saving ? "Creando..." : "Crear Kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ComponentsDialog({ kit, products, onClose, onSaved }: {
  kit: Kit | null
  products: Product[]
  onClose: () => void
  onSaved: () => void
}) {
  const [rows, setRows] = useState<{ componentProductId: string; quantity: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (kit) {
      setRows(
        kit.components.length > 0
          ? kit.components.map((c) => ({ componentProductId: c.componentProductId, quantity: String(c.quantity) }))
          : [{ componentProductId: "", quantity: "1" }]
      )
    }
  }, [kit])

  const addRow = () => setRows([...rows, { componentProductId: "", quantity: "1" }])
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: "componentProductId" | "quantity", value: string) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const save = async () => {
    const valid = rows.filter((r) => r.componentProductId && Number(r.quantity) > 0)
    if (valid.length === 0) {
      toast.error("Agrega al menos un componente válido")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}products/${kit?.id}/components`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ components: valid.map((r) => ({ componentProductId: r.componentProductId, quantity: Number(r.quantity) })) }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudieron guardar los componentes")
      toast.success("Componentes guardados")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar componentes")
    } finally {
      setSaving(false)
    }
  }

  const componentOptions = products.filter((p) => p.type !== "KIT" && p.id !== kit?.id)

  return (
    <Dialog open={!!kit} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Componentes de "{kit?.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select value={row.componentProductId} onValueChange={(v) => updateRow(idx, "componentProductId", v)}>
                <SelectTrigger className="h-11 flex-1">
                  <SelectValue placeholder="Producto componente..." />
                </SelectTrigger>
                <SelectContent>
                  {componentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                className="h-11 w-20"
              />
              <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="text-red-500 hover:bg-red-50 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Agregar componente
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {saving ? "Guardando..." : "Guardar Componentes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKit, setEditingKit] = useState<Kit | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const headers = { Authorization: token ? `Bearer ${token}` : "" }
      const [kitsRes, prodRes] = await Promise.all([
        fetch(`${apiBase}products/kits`, { headers }),
        fetch(`${apiBase}products`, { headers }),
      ])
      const kitsResult = await kitsRes.json()
      const prodResult = await prodRes.json()
      if (kitsRes.ok && kitsResult.ok) setKits(kitsResult.data)
      setProducts(Array.isArray(prodResult) ? prodResult : prodResult.data || [])
    } catch (err) {
      toast.error("Error al cargar kits")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kits y Combos</h1>
          <p className="text-sm text-gray-500">Productos armados a partir de otros — al venderse, descuentan sus componentes</p>
        </div>
        <CreateKitDialog onCreated={fetchAll} />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : kits.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <PackagePlus className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aún no has creado ningún kit</p>
        </div>
      ) : (
        <div className="space-y-4">
          {kits.map((kit) => {
            const totalCost = kit.components.reduce((sum, c) => sum + c.quantity * Number(c.componentProduct.cost || 0), 0)
            return (
              <div key={kit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{kit.name}</p>
                    <p className="text-xs font-mono text-gray-400">{kit.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Precio venta</p>
                      <p className="text-sm font-bold text-gray-900">{money(kit.price)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditingKit(kit)}>
                      Editar componentes
                    </Button>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-50 pt-3">
                  {kit.components.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      Este kit no tiene componentes configurados — no se podrá vender hasta que le agregues al menos uno.
                    </p>
                  ) : (
                    <>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 uppercase tracking-widest">
                            <th className="text-left font-bold pb-1.5">Componente</th>
                            <th className="text-right font-bold pb-1.5">Cantidad</th>
                            <th className="text-right font-bold pb-1.5">Stock disp.</th>
                            <th className="text-right font-bold pb-1.5">Costo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {kit.components.map((c) => (
                            <tr key={c.id}>
                              <td className="py-1.5 text-gray-700">{c.componentProduct.name}</td>
                              <td className="py-1.5 text-right font-bold text-gray-800">{c.quantity} {c.componentProduct.unit}</td>
                              <td className="py-1.5 text-right text-gray-500">{c.componentProduct.stock}</td>
                              <td className="py-1.5 text-right text-gray-500">{money(c.quantity * Number(c.componentProduct.cost || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-gray-400 mt-2">
                        Costo total de componentes: <span className="font-bold text-gray-600">{money(totalCost)}</span> · Margen estimado: <span className="font-bold text-emerald-600">{money(kit.price - totalCost)}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ComponentsDialog kit={editingKit} products={products} onClose={() => setEditingKit(null)} onSaved={fetchAll} />
    </div>
  )
}
