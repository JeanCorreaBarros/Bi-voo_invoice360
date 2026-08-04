"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Plus, FilePlus2, X } from "lucide-react"
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

type Invoice = { id: number; orderPrefix: string; orderId: number; orderReceiverName: string; orderTotalAmountDue: string; status: string }
type DebitNote = {
  id: number
  reason: string
  concept: string | null
  amount: string
  createdAt: string
  invoice: { id: number; orderPrefix: string; orderId: number; orderReceiverName: string }
  details: { id: number; description: string; quantity: number; price: number }[]
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

function CreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceId, setInvoiceId] = useState("")
  const [reason, setReason] = useState("")
  const [concept, setConcept] = useState("")
  const [lines, setLines] = useState<{ description: string; quantity: string; price: string }[]>([{ description: "", quantity: "1", price: "" }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const token = getToken()
    fetch(`${apiBase}invoices?limit=100`, { headers: { Authorization: token ? `Bearer ${token}` : "" } })
      .then((r) => r.json())
      .then((result) => setInvoices(result.data || result.invoices || []))
      .catch(() => {})
  }, [open])

  const addLine = () => setLines([...lines, { description: "", quantity: "1", price: "" }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: "description" | "quantity" | "price", value: string) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const submit = async () => {
    const items = lines.filter((l) => l.description.trim() && Number(l.price) > 0).map((l) => ({ description: l.description, quantity: Number(l.quantity || 1), price: Number(l.price) }))
    if (!invoiceId || !reason.trim() || items.length === 0) {
      toast.error("Selecciona factura, motivo y al menos un ítem con valor")
      return
    }
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}debit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ invoiceId: Number(invoiceId), reason, concept, items }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear la nota débito")
      toast.success("Nota débito creada — factura ajustada")
      setInvoiceId(""); setReason(""); setConcept(""); setLines([{ description: "", quantity: "1", price: "" }])
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la nota débito")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nueva Nota Débito
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Nota Débito</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Factura</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Seleccionar factura" />
              </SelectTrigger>
              <SelectContent>
                {invoices.filter((i) => i.status !== "CANCELLED").map((inv) => (
                  <SelectItem key={inv.id} value={String(inv.id)}>
                    {inv.orderPrefix}-{inv.orderId} · {inv.orderReceiverName} · {money(inv.orderTotalAmountDue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Concepto</Label>
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Interés de mora" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Ítems a cobrar</Label>
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

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: cobro adicional acordado con el cliente" className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={saving} className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)]">
            {saving ? "Creando..." : "Crear Nota Débito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function NotasDebitoPage() {
  const [notes, setNotes] = useState<DebitNote[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}debit-notes`, { headers: { Authorization: token ? `Bearer ${token}` : "" } })
      const result = await res.json()
      if (res.ok && result.ok) setNotes(result.data)
    } catch {
      toast.error("Error al cargar notas débito")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotes() }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notas Débito</h1>
              <p className="text-sm text-gray-500">Cobros adicionales y ajustes al alza sobre facturas emitidas</p>
            </div>
            <CreateDialog onCreated={fetchNotes} />
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : notes.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <FilePlus2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No se han creado notas débito</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Factura", "Cliente", "Concepto", "Valor", "Fecha", "Usuario"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notes.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{n.invoice.orderPrefix}-{n.invoice.orderId}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{n.invoice.orderReceiverName}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{n.concept || n.reason}</td>
                      <td className="px-5 py-3 text-sm font-bold text-emerald-600 whitespace-nowrap">+{money(n.amount)}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString("es-CO")}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{n.user?.name || "—"}</td>
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
