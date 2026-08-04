"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Plus, FileStack, X, AlertTriangle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type SupportDocument = {
  id: number
  supplierName: string
  supplierNit: string | null
  supplierIdType: string | null
  concept: string
  subtotal: number
  tax: number
  total: number
  status: string
  createdAt: string
  details: { id: number; description: string; quantity: number; price: number; total: number }[]
  user: { name: string } | null
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number | string) {
  return `$${Math.round(Number(n)).toLocaleString("es-CO")}`
}

const STATUS_META: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ISSUED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

function CreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ supplierName: "", supplierNit: "", supplierIdType: "CC", concept: "", tax: "" })
  const [lines, setLines] = useState<{ description: string; quantity: string; price: string }[]>([{ description: "", quantity: "1", price: "" }])
  const [saving, setSaving] = useState(false)

  const addLine = () => setLines([...lines, { description: "", quantity: "1", price: "" }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: "description" | "quantity" | "price", value: string) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const submit = async () => {
    const items = lines.filter((l) => l.description.trim() && Number(l.price) > 0).map((l) => ({ description: l.description, quantity: Number(l.quantity || 1), price: Number(l.price) }))
    if (!form.supplierName.trim() || !form.concept.trim() || items.length === 0) {
      toast.error("Proveedor, concepto y al menos un ítem son obligatorios")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ ...form, tax: form.tax ? Number(form.tax) : 0, items }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear el documento soporte")
      toast.success("Documento soporte creado (borrador interno)")
      setForm({ supplierName: "", supplierNit: "", supplierIdType: "CC", concept: "", tax: "" })
      setLines([{ description: "", quantity: "1", price: "" }])
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el documento soporte")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nuevo Documento Soporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Documento Soporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Proveedor (no obligado a facturar)</Label>
              <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="Nombre completo" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tipo Doc.</Label>
              <Select value={form.supplierIdType} onValueChange={(v) => setForm({ ...form, supplierIdType: v })}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula (CC)</SelectItem>
                  <SelectItem value="CE">Cédula Extranjería (CE)</SelectItem>
                  <SelectItem value="NIT">NIT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Número</Label>
              <Input value={form.supplierNit} onChange={(e) => setForm({ ...form, supplierNit: e.target.value })} className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Concepto</Label>
            <Input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej: Servicio de transporte" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Ítems</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input placeholder="Descripción" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} className="h-10 flex-1" />
                <Input type="number" min="1" placeholder="Cant." value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} className="h-10 w-16" />
                <Input type="number" min="0" placeholder="Valor" value={line.price} onChange={(e) => updateLine(idx, "price", e.target.value)} className="h-10 w-28" />
                <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="text-red-500 hover:bg-red-50 shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Agregar ítem
            </Button>
          </div>

          <div className="space-y-1.5 max-w-[140px]">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">IVA (opcional)</Label>
            <Input type="number" min="0" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="h-11" placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {saving ? "Creando..." : "Crear Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DocumentoSoportePage() {
  const [docs, setDocs] = useState<SupportDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-documents`, { headers: { Authorization: token ? `Bearer ${token}` : "" } })
      const result = await res.json()
      if (res.ok && result.ok) setDocs(result.data)
    } catch {
      toast.error("Error al cargar documentos soporte")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documento Soporte</h1>
              <p className="text-sm text-gray-500">Compras a proveedores no obligados a facturar</p>
            </div>
            <CreateDialog onCreated={fetchDocs} />
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Estos documentos quedan como borrador interno. El envío electrónico a la DIAN se activará cuando conectes un proveedor tecnológico (fase pendiente).</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <FileStack className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No se han creado documentos soporte</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Proveedor", "Concepto", "Total", "Estado", "Fecha", "Usuario"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {docs.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{d.supplierName}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{d.concept}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">{money(d.total)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_META[d.status] || "bg-gray-100 text-gray-500"}`}>{d.status}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString("es-CO")}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{d.user?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
