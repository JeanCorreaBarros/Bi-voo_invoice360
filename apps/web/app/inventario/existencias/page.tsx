"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Search, SlidersHorizontal, CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type StockItem = {
  id: string
  name: string
  sku: string
  barcode: string | null
  type: string
  category: string | null
  brand: string | null
  unit: string | null
  price: number
  cost: number | null
  stock: number
  minStock: number
  maxStock: number | null
  active: boolean
  value: number
  status: "agotado" | "bajo" | "normal" | "sobrestock"
}

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

function StatusBadge({ status }: { status: StockItem["status"] }) {
  if (status === "agotado")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={11} />Agotado</span>
  if (status === "bajo")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><AlertTriangle size={11} />Bajo stock</span>
  if (status === "sobrestock")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><TrendingUp size={11} />Sobrestock</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle size={11} />Normal</span>
}

function AdjustDialog({ product, onClose, onAdjusted }: {
  product: StockItem | null
  onClose: () => void
  onAdjusted: () => void
}) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (product) {
      setType("IN")
      setQuantity("")
      setReason("")
    }
  }, [product])

  const submit = async () => {
    if (!product || !quantity || Number(quantity) <= 0) {
      toast.error("Ingresa una cantidad válida")
      return
    }
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}products/${product.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ type, quantity: Number(quantity), reason: reason || undefined }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || "No se pudo ajustar el stock")
      toast.success("Stock actualizado")
      onAdjusted()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ajustar el stock")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Stock actual: <span className="font-bold text-gray-800">{product?.stock}</span></p>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tipo de movimiento</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["IN", "OUT", "ADJUST"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`h-10 rounded-xl text-xs font-bold transition-colors ${
                    type === t ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {t === "IN" ? "Entrada" : t === "OUT" ? "Salida" : "Ajustar a"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              {type === "ADJUST" ? "Nuevo stock" : "Cantidad"}
            </Label>
            <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Motivo (opcional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-11" placeholder="Ej: conteo físico, merma, ingreso manual..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={loading} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {loading ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ExistenciasPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | StockItem["status"]>("all")
  const [adjusting, setAdjusting] = useState<StockItem | null>(null)

  const fetchStock = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}inventory/stock`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al cargar existencias")
      setItems(result.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar existencias")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [])

  const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  const filtered = items.filter((p) => {
    const matchesSearch = !search || normalize(p.name).includes(normalize(search)) || normalize(p.sku).includes(normalize(search))
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalValue = filtered.reduce((s, p) => s + p.value, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Existencias</h1>
        <p className="text-sm text-gray-500">Stock actual por producto — {filtered.length} producto(s), valor {money(totalValue)}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 rounded-xl border-gray-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
          {(["all", "agotado", "bajo", "normal", "sobrestock"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "Todos" : s === "agotado" ? "Agotados" : s === "bajo" ? "Bajo stock" : s === "sobrestock" ? "Sobrestock" : "Normal"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No se encontraron productos</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-100">
                  {["SKU", "Producto", "Categoría", "Costo", "Stock", "Valor", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{money(p.cost || 0)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{p.stock} {p.unit || ""}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{money(p.value)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setAdjusting(p)} className="h-8 text-xs">
                        Ajustar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdjustDialog product={adjusting} onClose={() => setAdjusting(null)} onAdjusted={fetchStock} />
    </div>
  )
}
