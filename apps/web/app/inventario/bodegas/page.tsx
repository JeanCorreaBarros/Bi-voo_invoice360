"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Plus, Warehouse as WarehouseIcon, Star, Power, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Warehouse = {
  id: string
  name: string
  code: string | null
  address: string | null
  isDefault: boolean
  active: boolean
}

type StockByWarehouse = {
  warehouse: { id: string; name: string; code: string | null; isDefault: boolean; active: boolean }
  products: { productId: string; name: string; sku: string; unit: string | null; stock: number }[]
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

export default function BodegasPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stockData, setStockData] = useState<StockByWarehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", code: "", address: "" })
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const [wRes, sRes] = await Promise.all([
        fetch(`${apiBase}warehouses`, { headers: { Authorization: token ? `Bearer ${token}` : "" } }),
        fetch(`${apiBase}warehouses/stock-by-warehouse`, { headers: { Authorization: token ? `Bearer ${token}` : "" } }),
      ])
      const wResult = await wRes.json()
      const sResult = await sRes.json()
      if (!wRes.ok || !wResult.ok) throw new Error(wResult?.message || "Error al cargar bodegas")
      setWarehouses(wResult.data)
      if (sRes.ok && sResult.ok) setStockData(sResult.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar bodegas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const createWarehouse = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre de la bodega es obligatorio")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}warehouses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ name: form.name, code: form.code || undefined, address: form.address || undefined }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear la bodega")
      toast.success("Bodega creada")
      setForm({ name: "", code: "", address: "" })
      setOpen(false)
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la bodega")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (w: Warehouse) => {
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}warehouses/${w.id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo desactivar la bodega")
      toast.success("Bodega desactivada")
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo desactivar la bodega")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bodegas</h1>
          <p className="text-sm text-gray-500">Sucursales y centros de distribución de la empresa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Nueva Bodega
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Bodega</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Bodega Norte" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Código (opcional)</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="NORTE" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Dirección (opcional)</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Cra 45 # 12-30, Bogotá" className="h-11" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={createWarehouse} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
                {saving ? "Creando..." : "Crear Bodega"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {warehouses.map((w) => {
            const stock = stockData.find((s) => s.warehouse.id === w.id)
            const totalUnits = stock?.products.reduce((sum, p) => sum + p.stock, 0) || 0
            return (
              <div key={w.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-3 border-b border-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <WarehouseIcon className="h-5 w-5 text-[hsl(209,79%,35%)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900">{w.name}</p>
                        {w.isDefault && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            <Star className="h-2.5 w-2.5" /> Principal
                          </span>
                        )}
                      </div>
                      {w.code && <p className="text-xs font-mono text-gray-400">{w.code}</p>}
                      {w.address && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {w.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {!w.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(w)}
                      className={`rounded-lg ${w.active ? "text-red-500 hover:bg-red-50" : "text-gray-400"}`}
                      title={w.active ? "Desactivar bodega" : "Inactiva"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Existencias ({totalUnits} unidades)</p>
                  {!stock || stock.products.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin existencias en esta bodega</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                      {stock.products.map((p) => (
                        <li key={p.productId} className="text-xs text-gray-600 flex justify-between">
                          <span className="truncate">{p.name}</span>
                          <span className="font-bold text-gray-800 ml-2">{p.stock} {p.unit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
