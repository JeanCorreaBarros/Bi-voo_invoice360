"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Plus, AlertTriangle, XCircle, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Product = { id: string; name: string; sku: string; type: string; unit: string | null }
type Batch = {
  id: number
  productId: string
  productName: string
  sku: string
  unit: string | null
  batchNumber: string
  manufactureDate: string | null
  expiryDate: string | null
  initialQuantity: number
  quantity: number
  status: "vencido" | "proximo" | "vigente" | "sin_vencimiento"
  createdAt: string
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const STATUS_META: Record<Batch["status"], { label: string; className: string; icon: any }> = {
  vencido: { label: "Vencido", className: "bg-red-100 text-red-700", icon: XCircle },
  proximo: { label: "Próximo a vencer", className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  vigente: { label: "Vigente", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  sin_vencimiento: { label: "Sin vencimiento", className: "bg-gray-100 text-gray-500", icon: Clock },
}

function StatusBadge({ status }: { status: Batch["status"] }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  )
}

function CreateBatchDialog({ products, onCreated }: { products: Product[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ productId: "", batchNumber: "", manufactureDate: "", expiryDate: "", quantity: "" })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.productId || !form.batchNumber.trim() || !form.quantity) {
      toast.error("Producto, número de lote y cantidad son obligatorios")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          productId: form.productId,
          batchNumber: form.batchNumber,
          manufactureDate: form.manufactureDate || undefined,
          expiryDate: form.expiryDate || undefined,
          quantity: Number(form.quantity),
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear el lote")
      toast.success("Lote creado")
      setForm({ productId: "", batchNumber: "", manufactureDate: "", expiryDate: "", quantity: "" })
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el lote")
    } finally {
      setSaving(false)
    }
  }

  const eligible = products.filter((p) => p.type !== "KIT" && p.type !== "SERVICE")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nuevo Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Lote</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Producto</Label>
            <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-400">
              El producto se marca automáticamente como "maneja lotes" al crear su primer lote.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Número de Lote</Label>
            <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="LOTE-2026-08" className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Fabricación</Label>
              <Input type="date" value={form.manufactureDate} onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Vencimiento</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Cantidad</Label>
            <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {saving ? "Creando..." : "Crear Lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function LotesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | Batch["status"]>("all")

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const headers = { Authorization: token ? `Bearer ${token}` : "" }
      const [batchRes, prodRes] = await Promise.all([
        fetch(`${apiBase}batches`, { headers }),
        fetch(`${apiBase}products`, { headers }),
      ])
      const batchResult = await batchRes.json()
      const prodResult = await prodRes.json()
      if (batchRes.ok && batchResult.ok) setBatches(batchResult.data)
      setProducts(Array.isArray(prodResult) ? prodResult : prodResult.data || [])
    } catch (err) {
      toast.error("Error al cargar lotes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const filtered = batches.filter((b) => statusFilter === "all" || b.status === statusFilter)
  const counts = {
    vencido: batches.filter((b) => b.status === "vencido").length,
    proximo: batches.filter((b) => b.status === "proximo").length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lotes</h1>
          <p className="text-sm text-gray-500">Trazabilidad y vencimientos — las ventas consumen el lote que vence primero (FEFO)</p>
        </div>
        <CreateBatchDialog products={products} onCreated={fetchAll} />
      </div>

      {(counts.vencido > 0 || counts.proximo > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {counts.vencido > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm font-semibold">
              <XCircle className="h-4 w-4" /> {counts.vencido} lote(s) vencido(s)
            </div>
          )}
          {counts.proximo > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-700 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" /> {counts.proximo} lote(s) próximo(s) a vencer (30 días)
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto">
        {(["all", "vencido", "proximo", "vigente", "sin_vencimiento"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === s ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No hay lotes registrados</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-100">
                  {["Producto", "Lote", "Fabricación", "Vencimiento", "Inicial", "Disponible", "Estado"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{b.productName}</p>
                      <p className="text-[11px] font-mono text-gray-400">{b.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{b.batchNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.manufactureDate ? new Date(b.manufactureDate).toLocaleDateString("es-CO") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("es-CO") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.initialQuantity} {b.unit}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{b.quantity} {b.unit}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
