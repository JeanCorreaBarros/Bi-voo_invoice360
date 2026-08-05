"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Banknote, CreditCard, Wifi, MoreHorizontal, Plus, Minus, Trash2, UserPlus, X } from "lucide-react"
import toast from "react-hot-toast"
import type { CartLine, PosCustomer } from "./pos-types"
import { CASH_DENOMINATIONS, money } from "./pos-types"

type CardRow = { id: string; tipo: "CREDITO" | "DEBITO"; voucher: string; valor: string }
type OnlineRow = { id: string; method: "NEQUI" | "DAVIPLATA" | "TRANSFER"; valor: string }
type OtherRow = { id: string; label: string; valor: string }

const uid = () => Math.random().toString(36).slice(2, 9)

export type PosPaymentPayload = {
  payments: { method: string; amount: number; reference?: string; note?: string }[]
  note: string
  customer: { name: string; nit: string }
}

export function PosPaymentDialog({
  open,
  onOpenChange,
  cart,
  customers,
  loading,
  onConfirm,
  onCreateCustomer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartLine[]
  customers: PosCustomer[]
  loading: boolean
  onConfirm: (payload: PosPaymentPayload) => void
  onCreateCustomer: (data: { name: string; nit: string; phone?: string }) => Promise<PosCustomer>
}) {
  const [customerId, setCustomerId] = useState("__cf__")
  const [customerName, setCustomerName] = useState("Consumidor Final")
  const [customerNit, setCustomerNit] = useState("222222222222")

  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerNit, setNewCustomerNit] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const [cashAmount, setCashAmount] = useState(0)
  const [cashManual, setCashManual] = useState("")

  const [cardRows, setCardRows] = useState<CardRow[]>([])
  const [onlineRows, setOnlineRows] = useState<OnlineRow[]>([])
  const [otherRows, setOtherRows] = useState<OtherRow[]>([])
  const [note, setNote] = useState("")

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0)
    const iva = subtotal * 0.19
    const total = subtotal + iva
    const productsCount = cart.reduce((s, l) => s + l.quantity, 0)
    return { subtotal, iva, total, productsCount }
  }, [cart])

  const cardTotal = cardRows.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const onlineTotal = onlineRows.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const otherTotal = otherRows.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const totalEntered = cashAmount + cardTotal + onlineTotal + otherTotal

  const restante = Math.max(0, totals.total - totalEntered)
  const cambio = Math.max(0, totalEntered - totals.total)

  const resetForm = () => {
    setCashAmount(0)
    setCashManual("")
    setCardRows([])
    setOnlineRows([])
    setOtherRows([])
    setNote("")
    setCustomerId("__cf__")
    setCustomerName("Consumidor Final")
    setCustomerNit("222222222222")
    setShowNewCustomer(false)
    setNewCustomerName("")
    setNewCustomerNit("")
    setNewCustomerPhone("")
  }

  const handleClose = (v: boolean) => {
    if (!v) resetForm()
    onOpenChange(v)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerNit.trim()) {
      toast.error("Nombre y NIT/Cédula son obligatorios")
      return
    }
    setCreatingCustomer(true)
    try {
      const customer = await onCreateCustomer({
        name: newCustomerName.trim(),
        nit: newCustomerNit.trim(),
        phone: newCustomerPhone.trim() || undefined,
      })
      setCustomerId(customer.id)
      setCustomerName(customer.name)
      setCustomerNit(customer.nit || newCustomerNit.trim())
      setShowNewCustomer(false)
      setNewCustomerName("")
      setNewCustomerNit("")
      setNewCustomerPhone("")
      toast.success("Cliente registrado")
    } catch (err: any) {
      toast.error(err.message || "No se pudo registrar el cliente")
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleConfirm = () => {
    const payments: PosPaymentPayload["payments"] = []

    if (cashAmount > 0) payments.push({ method: "CASH", amount: cashAmount })

    for (const r of cardRows) {
      const amount = Number(r.valor) || 0
      if (amount <= 0) continue
      const tipoLabel = r.tipo === "CREDITO" ? "Crédito" : "Débito"
      payments.push({ method: "CARD", amount, reference: r.voucher ? `${tipoLabel} · ${r.voucher}` : tipoLabel })
    }

    for (const r of onlineRows) {
      const amount = Number(r.valor) || 0
      if (amount <= 0) continue
      payments.push({ method: r.method, amount })
    }

    for (const r of otherRows) {
      const amount = Number(r.valor) || 0
      if (amount <= 0) continue
      payments.push({ method: "OTHER", amount, reference: r.label || undefined })
    }

    onConfirm({
      payments,
      note,
      customer: { name: customerName || "Consumidor Final", nit: customerNit || "222222222222" },
    })
  }

  const canConfirm = totals.total > 0 && restante <= 0.01 && !loading

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] sm:max-w-[96vw] max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-6 pb-2">
          <DialogTitle className="text-lg">Registrar pago</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] xl:grid-cols-[2.4fr_1fr] gap-8 px-8 pb-8">
          {/* ───────── Columna izquierda: formas de pago ───────── */}
          <div className="space-y-5">
            {/* Efectivo */}
            <section className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="h-4 w-4 text-[hsl(209,79%,35%)]" />
                  <p className="font-semibold text-sm text-gray-800">Pagos en efectivo</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {CASH_DENOMINATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCashAmount((v) => v + d)}
                      className="rounded-lg border border-[hsl(209,79%,35%,0.35)] py-2 text-sm font-medium text-[hsl(209,79%,35%)] hover:border-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.06)] transition-colors"
                    >
                      {money(d)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Otro valor"
                    value={cashManual}
                    onChange={(e) => setCashManual(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCashAmount((v) => v + (Number(cashManual) || 0))
                      setCashManual("")
                    }}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(209,79%,35%,0.06)] text-sm">
                <span className="text-[hsl(209,79%,35%)]">Valor en efectivo:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[hsl(209,79%,27%)]">{money(cashAmount)}</span>
                  {cashAmount > 0 && (
                    <button type="button" onClick={() => setCashAmount(0)} className="text-[hsl(209,79%,35%,0.6)] hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Tarjeta */}
            <section className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[hsl(209,79%,35%)]" />
                    <p className="font-semibold text-sm text-gray-800">Pagos con tarjeta</p>
                  </div>
                  <RowCounter
                    count={cardRows.length}
                    onAdd={() => setCardRows((r) => [...r, { id: uid(), tipo: "CREDITO", voucher: "", valor: "" }])}
                    onRemove={() => setCardRows((r) => r.slice(0, -1))}
                  />
                </div>
                <div className="space-y-2">
                  {cardRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <Select value={row.tipo} onValueChange={(v: "CREDITO" | "DEBITO") => setCardRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, tipo: v } : r)))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDITO">Crédito</SelectItem>
                          <SelectItem value="DEBITO">Débito</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Nro. voucher"
                        className="h-9"
                        value={row.voucher}
                        onChange={(e) => setCardRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, voucher: e.target.value } : r)))}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Valor"
                        className="h-9"
                        value={row.valor}
                        onChange={(e) => setCardRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, valor: e.target.value } : r)))}
                      />
                      <button type="button" onClick={() => setCardRows((rows) => rows.filter((r) => r.id !== row.id))} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(209,79%,35%,0.06)] text-sm">
                <span className="text-[hsl(209,79%,35%)]">Valor en tarjetas:</span>
                <span className="font-semibold text-[hsl(209,79%,27%)]">{money(cardTotal)}</span>
              </div>
            </section>

            {/* En línea */}
            <section className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-[hsl(209,79%,35%)]" />
                    <p className="font-semibold text-sm text-gray-800">Pagos en línea</p>
                  </div>
                  <RowCounter
                    count={onlineRows.length}
                    onAdd={() => setOnlineRows((r) => [...r, { id: uid(), method: "NEQUI", valor: "" }])}
                    onRemove={() => setOnlineRows((r) => r.slice(0, -1))}
                  />
                </div>
                <div className="space-y-2">
                  {onlineRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Select value={row.method} onValueChange={(v: OnlineRow["method"]) => setOnlineRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, method: v } : r)))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEQUI">Nequi</SelectItem>
                          <SelectItem value="DAVIPLATA">Daviplata</SelectItem>
                          <SelectItem value="TRANSFER">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Valor"
                        className="h-9"
                        value={row.valor}
                        onChange={(e) => setOnlineRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, valor: e.target.value } : r)))}
                      />
                      <button type="button" onClick={() => setOnlineRows((rows) => rows.filter((r) => r.id !== row.id))} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(209,79%,35%,0.06)] text-sm">
                <span className="text-[hsl(209,79%,35%)]">Valor en pago en línea:</span>
                <span className="font-semibold text-[hsl(209,79%,27%)]">{money(onlineTotal)}</span>
              </div>
            </section>

            {/* Otros */}
            <section className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4 text-[hsl(209,79%,35%)]" />
                    <p className="font-semibold text-sm text-gray-800">Otros pagos</p>
                  </div>
                  <RowCounter
                    count={otherRows.length}
                    onAdd={() => setOtherRows((r) => [...r, { id: uid(), label: "", valor: "" }])}
                    onRemove={() => setOtherRows((r) => r.slice(0, -1))}
                  />
                </div>
                <div className="space-y-2">
                  {otherRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Input
                        placeholder="Concepto"
                        className="h-9"
                        value={row.label}
                        onChange={(e) => setOtherRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Valor"
                        className="h-9"
                        value={row.valor}
                        onChange={(e) => setOtherRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, valor: e.target.value } : r)))}
                      />
                      <button type="button" onClick={() => setOtherRows((rows) => rows.filter((r) => r.id !== row.id))} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(209,79%,35%,0.06)] text-sm">
                <span className="text-[hsl(209,79%,35%)]">Valor en otros métodos de pago:</span>
                <span className="font-semibold text-[hsl(209,79%,27%)]">{money(otherTotal)}</span>
              </div>
            </section>

            <div className="space-y-1.5">
              <Label htmlFor="pos-note">Observaciones</Label>
              <Textarea id="pos-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {/* ───────── Columna derecha: información de pago ───────── */}
          <div className="lg:sticky lg:top-0 lg:h-full">
            <div className="border border-gray-200 rounded-xl p-4 space-y-3 lg:h-full">
              <p className="font-semibold text-sm text-gray-700 mb-1">Información de pago</p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pos-customer-name" className="text-xs text-gray-500">Cliente</Label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-[hsl(209,79%,35%)] hover:underline"
                  >
                    {showNewCustomer ? <X className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    {showNewCustomer ? "Cancelar" : "Nuevo cliente"}
                  </button>
                </div>

                {showNewCustomer ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                    <Input
                      placeholder="NIT / Cédula *"
                      className="h-9 bg-white"
                      value={newCustomerNit}
                      onChange={(e) => setNewCustomerNit(e.target.value)}
                    />
                    <Input
                      placeholder="Nombre completo *"
                      className="h-9 bg-white"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Input
                      placeholder="Teléfono (opcional)"
                      className="h-9 bg-white"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={creatingCustomer}
                      onClick={handleCreateCustomer}
                    >
                      {creatingCustomer ? "Guardando..." : "Guardar y usar este cliente"}
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={customerId}
                    onValueChange={(v) => {
                      setCustomerId(v)
                      if (v === "__cf__") {
                        setCustomerName("Consumidor Final")
                        setCustomerNit("222222222222")
                        return
                      }
                      const c = customers.find((c) => c.id === v)
                      if (c) {
                        setCustomerName(c.name)
                        setCustomerNit(c.nit || "222222222222")
                      }
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Consumidor Final" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__cf__">Consumidor Final</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex justify-between text-sm text-gray-500 pt-1">
                <span>Nro. de productos:</span>
                <span className="text-gray-900">{totals.productsCount}</span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Total bruto:</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Descuento aplicado:</span>
                  <span>{money(0)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Total IVA:</span>
                  <span>{money(totals.iva)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[hsl(209,79%,35%,0.08)] px-3.5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[hsl(209,79%,27%)]">Total a pagar</span>
                <span className="text-xl font-bold text-[hsl(209,79%,27%)]">{money(totals.total)}</span>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Recibido:</span>
                  <span className="text-gray-900 font-medium">{money(totalEntered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Restante:</span>
                  <span className={restante > 0.01 ? "text-red-600 font-semibold" : "text-gray-900"}>{money(restante)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cambio:</span>
                  <span className="text-gray-900 font-medium">{money(cambio)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white mt-2 h-11"
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                {loading ? "Guardando..." : "Guardar y facturar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RowCounter({ count, onAdd, onRemove }: { count: number; onAdd: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRemove}
        disabled={count === 0}
        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="text-sm w-4 text-center text-gray-700">{count}</span>
      <button
        type="button"
        onClick={onAdd}
        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
