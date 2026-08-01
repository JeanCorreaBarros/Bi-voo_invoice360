"use client"

import { useState, useEffect, useCallback } from "react"
import { type Invoice } from "@/lib/invoice-data"
import { InvoiceDetail } from "./invoice-detail"
import { Search, Filter, MoreVertical, ChevronDown, X, CreditCard, DollarSign } from "lucide-react"
import { toast } from "react-hot-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type TabFilter = "all" | "draft" | "pending" | "send" | "paid"

export function InvoiceList() {
  const [activeTab, setActiveTab] = useState<TabFilter>("pending")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  // Payment Modal State
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
      const token = sessionStorage.getItem("token")

      if (!token) {
        setError("Token de autenticación no encontrado")
        setLoading(false)
        return
      }

      const res = await fetch(`${apiBase}invoices?page=${page}&limit=${limit}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (!res.ok) throw new Error("Error al cargar facturas")
      const data = await res.json()

      // Map API data to Invoice format
      const mappedInvoices: Invoice[] = (data?.data || []).map((inv: any) => {
        const initials = inv.orderReceiverName
          ? inv.orderReceiverName.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
          : "UN"

        return {
          id: String(inv.id),
          number: `${inv.orderPrefix}-${String(inv.orderId).padStart(3, "0")}`,
          company: "Plásticos LC",
          customer: inv.orderReceiverName || "N/A",
          customerAvatar: initials,
          email: inv.orderReceiverEmail,
          status: (inv.status === "DRAFT" ? "Draft" : inv.status === "SENT" ? "Sent" : inv.status === "PENDING" ? "Unsent" : inv.status === "PARTIAL" ? "Partial" : inv.status === "PAID" ? "Paid" : inv.status === "CANCELLED" ? "Cancelled" : inv.status === "OVERDUE" ? "Overdue" : "Unsent") as Invoice['status'],
          amount: Number(inv.orderTotalAfterTax || 0),
          daysAgo: inv.orderDate ? `hace ${Math.floor((Date.now() - new Date(inv.orderDate).getTime()) / (1000 * 60 * 60 * 24))} dias` : "N/A",
          createdAt: inv.createdAt || inv.orderDate || null,
          dueDate: inv.dueDate || null,
          lineItems: (inv.details || []).map((detail: any) => ({
            description: detail.itemName || detail.product?.name || "Sin nombre",
            amount: Number(detail.orderItemFinalAmount || detail.orderItemPrice || 0),
            quantity: Number(detail.orderItemQuantity || 1),
            unitPrice: Number(detail.orderItemPrice || 0),
          })),
          subtotal: Number(inv.orderSubtotalBeforeTax || 0),
          total: Number(inv.orderTotalAfterTax || 0),
          balanceDue: Number(inv.orderTotalAmountDue || inv.orderTotalAfterTax || 0),
        }
      })

      setInvoices(mappedInvoices)
      setTotal(data?.total || 0)
      if (mappedInvoices.length > 0 && !selectedInvoice) {
        setSelectedInvoice(mappedInvoices[0])
      }
    } catch (err) {
      console.warn("Error fetching invoices:", err)
      setError("No se pudieron cargar las facturas")
    } finally {
      setLoading(false)
    }
  }, [page, limit, selectedInvoice])

  // Initial and reactive fetch
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const filteredInvoices = invoices.filter((inv) => {
    // Search filter
    const searchMatch = !searchTerm ||
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer.toLowerCase().includes(searchTerm.toLowerCase())

    if (!searchMatch) return false

    // Tab filter
    switch (activeTab) {
      case "draft":
        return inv.status === "Draft"
      case "pending":
        return ["Unsent", "Sent", "Partial", "Overdue"].includes(inv.status)
      case "send":
        return inv.status === "Sent"
      case "paid":
        return inv.status === "Paid"
      default:
        return true
    }
  })

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: "all", label: "Todas" },
    { key: "draft", label: "Borrador" },
    { key: "pending", label: "Pendientes", count: filteredInvoices.length },
    { key: "send", label: "Enviadas" },
    { key: "paid", label: "Pagadas" },
  ]

  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv)
    setShowDetail(true)
  }

  const handlePaymentClick = (inv: Invoice) => {
    setPaymentInvoice(inv)
    setPaymentAmount(inv.balanceDue.toString())
  }

  const confirmPayment = async () => {
    if (!paymentInvoice) return
    const amountNum = parseFloat(paymentAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Ingrese un monto válido")
      return
    }

    const processPayment = async (amount: number) => {
      try {
        setIsProcessingPayment(true)
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
        const token = sessionStorage.getItem("token")
        const res = await fetch(`${apiBase}payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            invoiceId: Number(paymentInvoice.id),
            amount: amount,
            method: "CASH",
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error((err as any)?.message || "Error al registrar el pago")
          return
        }
        toast.success("Pago registrado exitosamente")
        setPaymentInvoice(null)
        fetchInvoices() // Refresh list
      } catch {
        toast.error("Error de red al procesar el pago")
      } finally {
        setIsProcessingPayment(false)
      }
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-sm text-[hsl(222,15%,20%)]">
          ¿Estás seguro de registrar un pago de ${amountNum.toLocaleString("es-CO", { minimumFractionDigits: 2 })} en efectivo (CASH)?
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={() => toast.dismiss(t.id)} disabled={isProcessingPayment}>
            Cancelar
          </Button>
          <Button size="sm" className="bg-[hsl(209,83%,23%)] text-white hover:bg-[hsl(209,83%,30%)]" disabled={isProcessingPayment} onClick={() => {
            toast.dismiss(t.id)
            processPayment(amountNum)
          }}>
            Aceptar
          </Button>
        </div>
      </div>
    ), { duration: Infinity, id: 'payment-confirm' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="hidden flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-sans">Filtros activos</span>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-[hsl(0,0%,80%)] hover:bg-[hsl(228,10%,24%)] transition-colors font-sans text-xs"
          >
            Clientes
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-[hsl(0,0%,80%)] hover:bg-[hsl(228,10%,24%)] transition-colors font-sans text-xs"
          >
            Estado
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-sans hidden sm:inline">Enero 2026</span>
          <span className="text-xs text-muted-foreground font-sans hidden sm:inline">-</span>
          <span className="text-xs text-muted-foreground font-sans hidden sm:inline">Febrero 2026</span>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-[hsl(0,0%,80%)] hover:bg-[hsl(228,10%,24%)] transition-colors font-sans text-xs"
          >
            <Filter className="h-3 w-3" />
            Filtrar
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-secondary text-[hsl(0,0%,80%)] hover:bg-[hsl(228,10%,24%)] transition-colors"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[hsl(209,83%,23%)] transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Buscar por número de factura o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-11 pr-11 rounded-xl bg-white border border-border focus:ring-2 focus:ring-[hsl(209,83%,23%,0.2)] focus:border-[hsl(209,83%,23%)] transition-all outline-none font-sans text-sm text-[hsl(222,15%,10%)] shadow-sm placeholder:text-muted-foreground/60"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[hsl(209,83%,23%)] border border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-colors whitespace-nowrap ${activeTab === tab.key
              ? "bg-secondary text-[hsl(0,0%,95%)] font-medium"
              : "text-muted-foreground hover:text-[hsl(0,0%,80%)]"
              }`}
          >
            {tab.label}
            {tab.count !== undefined && activeTab === tab.key && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${"bg-[hsl(228,10%,25%)] text-[hsl(0,0%,80%)]"
                  }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto hidden items-center">
          <button type="button" className="p-1.5 text-muted-foreground hover:text-[hsl(0,0%,80%)] transition-colors" aria-label="Mas opciones">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Invoice list */}
        <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col shrink-0">
          <h3 className="text-sm font-black text-[hsl(209,83%,23%)] font-sans mb-3 px-1 uppercase tracking-wider">
            {activeTab === "all"
              ? "Todas las Facturas"
              : activeTab === "draft"
                ? "Borradores"
                : activeTab === "pending"
                  ? "Pendientes"
                  : activeTab === "send"
                    ? "Enviadas"
                    : "Todas las Facturas"}
          </h3>
          <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            {loading ? (
              <div className="p-8 text-center text-[hsl(209,83%,23%)] text-sm font-sans">Cargando facturas...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500 text-sm font-sans">{error}</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-[hsl(209,83%,23%)] text-sm font-sans">
                No hay facturas en esta categoria
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectInvoice(inv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectInvoice(inv)
                    }
                  }}
                  className={`flex items-center gap-3 hover:scale-95 p-3 rounded-xl transition-all text-left w-full group cursor-pointer ${selectedInvoice?.id === inv.id
                    ? "bg-[hsl(209,83%,23%)] ring-1 ring-[hsl(90,100%,50%,0.3)] text-[hsl(0,0%,95%)]"
                    : "text-[hsl(222,15%,10%)] hover:bg-[hsl(209,83%,23%)]"
                    }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[hsl(228,10%,25%)] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[hsl(0,0%,80%)] font-sans">
                      {inv.customerAvatar}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-bold font-sans transition-colors ${selectedInvoice?.id === inv.id ? "text-white" : "text-[hsl(209,83%,23%)] group-hover:text-white"}`}>
                        # {inv.number}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider transition-colors ${inv.status === "Unsent"
                          ? (selectedInvoice?.id === inv.id ? "bg-white/20 text-white" : "bg-[hsl(45,100%,50%,0.15)] text-[hsl(45,100%,40%)] group-hover:bg-white/20 group-hover:text-white")
                          : inv.status === "Viewed"
                            ? "bg-[hsl(200,60%,50%,0.15)] text-[hsl(200,60%,40%)]"
                            : inv.status === "Paid"
                              ? (selectedInvoice?.id === inv.id ? "bg-[hsl(142,70%,45%)] text-white" : "bg-[hsl(142,70%,45%,0.15)] text-[hsl(142,70%,30%)] group-hover:bg-[hsl(142,70%,45%)] group-hover:text-white")
                              : inv.status === "Draft"
                                ? "bg-[hsl(228,10%,30%,0.5)] text-white"
                                : inv.status === "Sent"
                                  ? "bg-[hsl(120,60%,50%,0.15)] text-[hsl(120,60%,40%)]"
                                  : inv.status === "Partial"
                                    ? "bg-[hsl(30,100%,50%,0.15)] text-[hsl(30,100%,40%)]"
                                    : inv.status === "Cancelled"
                                      ? "bg-[hsl(0,84%,60%,0.15)] text-[hsl(0,84%,50%)]"
                                      : "bg-[hsl(0,84%,60%,0.15)] text-[hsl(0,84%,50%)]"
                          }`}
                      >
                        {inv.status === "Unsent"
                          ? "Pendiente"
                          : inv.status === "Viewed"
                            ? "Vista"
                            : inv.status === "Paid"
                              ? "Pagada"
                              : inv.status === "Draft"
                                ? "Borrador"
                                : inv.status === "Sent"
                                  ? "Enviada"
                                  : inv.status === "Partial"
                                    ? "Pago Parcial"
                                    : inv.status === "Cancelled"
                                      ? "Anulada"
                                      : "Vencida"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[13px] font-medium font-sans truncate transition-colors ${selectedInvoice?.id === inv.id ? "text-white/90" : "text-[hsl(222,15%,20%)] group-hover:text-white/90"}`}>
                        {inv.customer}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-sans transition-colors ${selectedInvoice?.id === inv.id ? "text-white/60" : "text-muted-foreground group-hover:text-white/60"}`}>
                          <span className="font-semibold text-[9px] uppercase tracking-wider mr-1 opacity-70">CREA:</span>
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB") : inv.daysAgo}
                        </span>
                        {inv.dueDate && (
                          <>
                            <span className={`text-[10px] ${selectedInvoice?.id === inv.id ? "text-white/30" : "text-border group-hover:text-white/30"}`}>|</span>
                            <span className={`text-[11px] font-sans transition-colors ${selectedInvoice?.id === inv.id ? "text-orange-200" : "text-orange-600/80 group-hover:text-orange-200"}`}>
                              <span className="font-semibold text-[9px] uppercase tracking-wider mr-1 opacity-70">VENCE:</span>
                              {new Date(inv.dueDate).toLocaleDateString("en-GB")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount + Payment button */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-sm font-semibold font-sans transition-colors ${selectedInvoice?.id === inv.id ? "text-white" : "text-[hsl(222,15%,10%)] group-hover:text-white"}`}>
                      ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePaymentClick(inv) }}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${selectedInvoice?.id === inv.id
                          ? "bg-green-400/30 text-green-200 hover:bg-green-400/50"
                          : "bg-green-100 text-green-700 hover:bg-green-200 group-hover:bg-green-400/30 group-hover:text-green-100"
                          }`}
                        aria-label="Registrar pago"
                        title="Registrar pago"
                      >
                        <CreditCard className="h-2.5 w-2.5" /> Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 px-2 py-3 bg-white/50 backdrop-blur-sm rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-border shadow-sm text-xs font-semibold text-[hsl(209,83%,23%)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <div className="text-xs font-bold text-[hsl(209,83%,23%)] font-sans">
                Página <span className="bg-[hsl(209,83%,23%)] text-white px-2 py-0.5 rounded mx-1">{page}</span> de {Math.ceil(total / limit)}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-border shadow-sm text-xs font-semibold text-[hsl(209,83%,23%)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        {/* Invoice detail */}
        {selectedInvoice && (
          <>
            {/* Desktop detail */}
            <div className="hidden lg:block flex-1">
              <InvoiceDetail invoice={selectedInvoice} onRefresh={() => fetchInvoices()} />
            </div>

            {/* Mobile detail overlay */}
            {showDetail && (
              <div className="fixed inset-0 z-[60] bg-white lg:hidden overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[hsl(230,74%,17%)] border-b border-border">
                  <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)] font-sans">
                    Factura #{selectedInvoice.number}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDetail(false)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-[hsl(0,0%,90%)] hover:bg-secondary transition-colors"
                    aria-label="Cerrar detalle"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4 pb-24">
                  <InvoiceDetail invoice={selectedInvoice} onRefresh={() => fetchInvoices()} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Payment Modal */}
        <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
          <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Introduce el monto a pagar para la factura #{paymentInvoice?.number}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto del Pago (Efectivo)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    className="pl-9"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={isProcessingPayment}
                  />
                </div>
              </div>
              {paymentInvoice && (
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="flex justify-between">
                    <span>Saldo Pendiente:</span>
                    <span className="font-semibold text-gray-900">${paymentInvoice.balanceDue.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentInvoice(null)} disabled={isProcessingPayment}>
                Cancelar
              </Button>
              <Button onClick={confirmPayment} disabled={isProcessingPayment || !paymentAmount} className="bg-green-600 hover:bg-green-700 text-white">
                {isProcessingPayment ? "Procesando..." : "Realizar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
