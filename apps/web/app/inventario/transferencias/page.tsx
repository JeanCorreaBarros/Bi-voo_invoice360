"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Warehouse = { id: string; name: string; isDefault: boolean; active: boolean }
type Product = { id: string; name: string; sku: string; stock: number }
type Transfer = {
  id: number
  product: string
  sku: string
  fromWarehouse: string
  toWarehouse: string
  quantity: number
  reason: string | null
  user: string | null
  createdAt: string
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

export default function TransferenciasPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: "", reason: "" })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const headers = { Authorization: token ? `Bearer ${token}` : "" }
      const [wRes, pRes, tRes] = await Promise.all([
        fetch(`${apiBase}warehouses`, { headers }),
        fetch(`${apiBase}products`, { headers }),
        fetch(`${apiBase}warehouses/transfers`, { headers }),
      ])
      const wResult = await wRes.json()
      const pResult = await pRes.json()
      const tResult = await tRes.json()
      if (wRes.ok && wResult.ok) setWarehouses(wResult.data)
      if (pRes.ok) setProducts(Array.isArray(pResult) ? pResult : pResult.data || [])
      if (tRes.ok && tResult.ok) setTransfers(tResult.data)
    } catch (err) {
      toast.error("Error al cargar transferencias")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const submitTransfer = async () => {
    if (!form.productId || !form.fromWarehouseId || !form.toWarehouseId || !form.quantity) {
      toast.error("Completa producto, bodegas y cantidad")
      return
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      toast.error("La bodega de origen y destino no pueden ser la misma")
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}warehouses/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          productId: form.productId,
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          quantity: Number(form.quantity),
          reason: form.reason || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear la transferencia")
      toast.success("Transferencia registrada")
      setForm({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: "", reason: "" })
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la transferencia")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transferencias entre Bodegas</h1>
        <p className="text-sm text-gray-500">Mueve existencias de una bodega a otra sin afectar el stock total</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Producto</Label>
            <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Cantidad</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Bodega Origen</Label>
            <Select value={form.fromWarehouseId} onValueChange={(v) => setForm({ ...form, fromWarehouseId: v })}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Desde..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Bodega Destino</Label>
            <Select value={form.toWarehouseId} onValueChange={(v) => setForm({ ...form, toWarehouseId: v })}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Hacia..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Motivo (opcional)</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="h-11" placeholder="Ej: reabastecimiento de sucursal" />
          </div>
        </div>

        <Button
          onClick={submitTransfer}
          disabled={submitting}
          className="mt-4 h-11 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2 px-6"
        >
          <ArrowRightLeft className="h-4 w-4" /> {submitting ? "Transfiriendo..." : "Registrar Transferencia"}
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Historial de transferencias</h2>
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando...</div>
        ) : transfers.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No se han registrado transferencias</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Fecha", "Producto", "Origen", "Destino", "Cantidad", "Motivo", "Usuario"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{t.product}</p>
                      <p className="text-[11px] font-mono text-gray-400">{t.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.fromWarehouse}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.toWarehouse}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{t.quantity}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.reason || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.user || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
