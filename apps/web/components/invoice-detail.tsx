"use client"

import { useState, useEffect } from "react"
import type { Invoice } from "@/lib/invoice-data"
import {
  Edit3,
  Send,
  Loader2,
  MoreVertical,
  Download,
  CreditCard,
  Eye,
  Calendar,
  AlarmClock,
  DollarSign
} from "lucide-react"
import { InvoiceEditDialog } from "./invoice-edit-dialog"
import { toast } from "react-hot-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InvoiceDetailProps {
  invoice: Invoice
  onRefresh?: () => void
}

export function InvoiceDetail({ invoice, onRefresh }: InvoiceDetailProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(invoice.status)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [isPayingInvoice, setIsPayingInvoice] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>("")

  // Sync internal state with invoice prop when it changes
  useEffect(() => {
    setSelectedStatus(invoice.status)
    // Clear previous UI states
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
    setShowPdfPreview(false)
    setShowDownloadDialog(false)
    setShowPaymentModal(false)
  }, [invoice.id, invoice.status])

  const statusToApi: Record<string, string> = {
    "Draft": "DRAFT",
    "Sent": "SENT",
    "Unsent": "PENDING",
    "Partial": "PARTIAL",
    "Paid": "PAID",
    "Cancelled": "CANCELLED",
    "Overdue": "OVERDUE",
    "Viewed": "PENDING"
  }

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    "Unsent": { label: "Pendiente", bg: "bg-yellow-100", text: "text-yellow-700" },
    "Viewed": { label: "Vista", bg: "bg-blue-100", text: "text-blue-700" },
    "Paid": { label: "Pagada", bg: "bg-green-100", text: "text-green-700" },
    "Draft": { label: "Borrador", bg: "bg-gray-200", text: "text-gray-700" },
    "Sent": { label: "Enviada", bg: "bg-emerald-100", text: "text-emerald-700" },
    "Partial": { label: "Pago Parcial", bg: "bg-orange-100", text: "text-orange-700" },
    "Cancelled": { label: "Anulada", bg: "bg-red-100", text: "text-red-700" },
    "Overdue": { label: "Vencida", bg: "bg-red-100", text: "text-red-700" }
  }

  const handleStatusChange = async (newStatus: Invoice['status']) => {
    setIsUpdatingStatus(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
      const token = sessionStorage.getItem("token")

      const response = await fetch(`${apiBase}invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusToApi[newStatus]
        })
      })

      if (response.ok) {
        setSelectedStatus(newStatus)
        toast.success('Estado actualizado exitosamente')
        onRefresh?.()
      } else {
        toast.error('Error al actualizar el estado')
      }
    } catch {
      toast.error('Error de red al actualizar el estado')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSendEmail = async () => {
    if (!invoice.email) {
      toast.error('El cliente no tiene un correo electrónico asociado')
      return
    }

    setIsSending(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
      const response = await fetch(`${apiBase}invoice-documents/${invoice.id}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invoice.email,
          style: "modern"
        })
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(data.message || 'Factura enviada exitosamente')
      } else {
        toast.error(data.message || 'Error al enviar la factura')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setIsSending(false)
    }
  }

  const downloadInvoice = async (style: 'classic' | 'dian') => {
    if (!invoice.id) {
      toast.error('No hay una factura para descargar')
      setShowDownloadDialog(false)
      return
    }

    setIsDownloading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/";
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${apiBase}invoice-documents/${invoice.id}/pdf${style !== 'classic' ? '?style=dian' : ''}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${style}-${invoice.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Factura descargada en estilo ${style}`)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Error al descargar la factura')
    } finally {
      setIsDownloading(false)
      setShowDownloadDialog(false)
    }
  }

  const handlePreviewPdf = async () => {
    if (!invoice.id) {
      toast.error('No hay una factura para previsualizar')
      return
    }
    setIsPdfLoading(true)
    setShowPdfPreview(true)
    setPdfUrl(null)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${apiBase}invoice-documents/${invoice.id}/pdf`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch {
      toast.error('Error al cargar la previsualización')
      setShowPdfPreview(false)
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handlePaymentClick = () => {
    setPaymentAmount(invoice.balanceDue.toString())
    setShowPaymentModal(true)
  }

  const confirmPayment = async () => {
    const amountNum = parseFloat(paymentAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Ingrese un monto válido")
      return
    }

    const processPayment = async (amount: number) => {
      setIsPayingInvoice(true)
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
        const token = sessionStorage.getItem("token")
        const res = await fetch(`${apiBase}payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            invoiceId: Number(invoice.id),
            amount: amount,
            method: "CASH",
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error((err as any)?.message || "Error al registrar el pago")
          return
        }
        toast.success(`Pago exitoso de $${amount.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`)
        setShowPaymentModal(false)
        onRefresh?.()
      } catch {
        toast.error("Error de red al procesar el pago")
      } finally {
        setIsPayingInvoice(false)
      }
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-sm text-[hsl(222,15%,20%)]">
          ¿Estás seguro de registrar un pago de ${amountNum.toLocaleString("es-CO", { minimumFractionDigits: 2 })} en efectivo (CASH)?
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={() => toast.dismiss(t.id)} disabled={isPayingInvoice}>
            Cancelar
          </Button>
          <Button size="sm" className="bg-[hsl(209,83%,23%)] text-white hover:bg-[hsl(209,83%,30%)]" disabled={isPayingInvoice} onClick={() => {
            toast.dismiss(t.id)
            processPayment(amountNum)
          }}>
            Aceptar
          </Button>
        </div>
      </div>
    ), { duration: Infinity, id: 'payment-confirm-detail' })
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-GB")
  }

  const currentStatus = statusConfig[selectedStatus] || statusConfig["Overdue"]

  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-4 md:p-5 pb-3 md:pb-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl md:rounded-t-2xl">
        <div className="flex flex-col gap-3">

          {/* Primera fila: Número, Estado y Menú mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold font-sans">#{invoice.number}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-sans font-medium ${currentStatus.bg} ${currentStatus.text}`}>
                {currentStatus.label}
              </span>
            </div>

            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar factura
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
                    {isSending
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Send className="h-4 w-4 mr-2" />
                    }
                    {isSending ? "Enviando..." : "Enviar por email"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDownloadDialog(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePreviewPdf}>
                    <Eye className="h-4 w-4 mr-2" />
                    Previsualizar PDF
                  </DropdownMenuItem>
                  {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
                    <DropdownMenuItem onClick={handlePaymentClick} disabled={isPayingInvoice}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Registrar pago
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Segunda fila: Cliente y Empresa */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-gray-600 font-sans mb-0.5 text-left">Cliente</span>
              <div className="flex items-center gap-1.5 justify-start">
                <div className="w-5 h-5 rounded-full bg-[hsl(226,79%,22%)] flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white font-sans">
                    {invoice.customerAvatar}
                  </span>
                </div>
                <span className="text-sm font-medium font-sans text-gray-900 truncate">
                  {invoice.customer}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-600 font-sans mb-0.5 text-right">Empresa</span>
              <span className="text-sm font-semibold font-sans text-gray-900 truncate text-right">
                {invoice.company}
              </span>
            </div>
          </div>

          {/* Tercera fila: Fechas */}
          {(invoice.createdAt || invoice.dueDate) && (
            <div className="flex items-center gap-4 pt-1 border-t border-blue-100">
              {invoice.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-sans leading-none">Creación</span>
                    <span className="text-xs font-semibold text-gray-700 font-sans">{formatDate(invoice.createdAt)}</span>
                  </div>
                </div>
              )}
              {invoice.dueDate && (
                <div className="flex items-center gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-sans leading-none">Vencimiento</span>
                    <span className="text-xs font-semibold text-gray-700 font-sans">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-5">

        {/* Line items — tabla */}
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[hsl(209,83%,23%)] text-white">
                <th className="text-left px-4 py-2.5 font-semibold font-sans text-xs tracking-wide">Descripción</th>
                <th className="text-center px-3 py-2.5 font-semibold font-sans text-xs tracking-wide hidden sm:table-cell">Cant.</th>
                <th className="text-right px-3 py-2.5 font-semibold font-sans text-xs tracking-wide hidden sm:table-cell">Precio Unit.</th>
                <th className="text-right px-4 py-2.5 font-semibold font-sans text-xs tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems.map((item, index) => (
                <tr
                  key={index}
                  className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-4 py-3 font-sans text-gray-800 font-medium text-sm">{item.description}</td>
                  <td className="px-3 py-3 text-center text-gray-600 font-sans text-sm hidden sm:table-cell">
                    {item.quantity ?? 1}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 font-sans text-sm hidden sm:table-cell">
                    ${(item.unitPrice ?? item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[hsl(209,83%,23%)] font-sans text-sm">
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-xs text-gray-500 font-sans font-medium">Subtotal</span>
              <span className="text-sm font-semibold text-gray-700 font-sans">
                ${invoice.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-xs text-gray-500 font-sans font-medium">Total</span>
              <span className="text-sm font-semibold text-gray-700 font-sans">
                ${invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-blue-50">
              <span className="text-sm text-blue-700 font-sans font-bold">Balance Pendiente</span>
              <span className="text-base font-extrabold text-blue-800 font-sans">
                ${invoice.balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions — desktop */}
        <div className="mt-5 md:mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditDialogOpen(true)}
              className="p-2 rounded-lg text-gray-600 flex hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Editar factura"
              title="Editar factura"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDownloadDialog(true)}
              className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label="Descargar factura"
              title="Descargar PDF"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              aria-label="Previsualizar factura en PDF"
              title="Previsualizar PDF"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending}
              className={`p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 ${isSending ? 'px-3' : ''}`}
              aria-label="Enviar factura"
              title="Enviar por email"
            >
              {isSending ? (
                <span className="flex items-center gap-1 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando
                </span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
            {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
              <button
                type="button"
                onClick={handlePaymentClick}
                disabled={isPayingInvoice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm disabled:cursor-not-allowed"
                aria-label="Registrar pago"
                title="Registrar pago en efectivo"
              >
                {isPayingInvoice ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                {isPayingInvoice ? "Procesando..." : "Registrar Pago"}
              </button>
            )}
          </div>
          <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
            <SelectTrigger className="w-[180px] hidden md:flex bg-[hsl(209,83%,23%)] text-white border-none">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Borrador</SelectItem>
              <SelectItem value="Sent">Enviada</SelectItem>
              <SelectItem value="Unsent">Pendiente</SelectItem>
              <SelectItem value="Partial">Pago Parcial</SelectItem>
              <SelectItem value="Paid">Pagada</SelectItem>
              <SelectItem value="Cancelled">Anulada</SelectItem>
              <SelectItem value="Overdue">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selector de estado — solo mobile */}
        <div className="mt-4 flex md:hidden">
          <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
            <SelectTrigger className="w-full h-11 bg-[hsl(209,83%,23%)] text-white border-none">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Borrador</SelectItem>
              <SelectItem value="Sent">Enviada</SelectItem>
              <SelectItem value="Unsent">Pendiente</SelectItem>
              <SelectItem value="Partial">Pago Parcial</SelectItem>
              <SelectItem value="Paid">Pagada</SelectItem>
              <SelectItem value="Cancelled">Anulada</SelectItem>
              <SelectItem value="Overdue">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Edit Dialog */}
      <InvoiceEditDialog
        invoiceId={invoice.id}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={() => window.location.reload()}
      />

      {/* Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="bg-white z-[100]">
          <DialogHeader>
            <DialogTitle>Seleccionar estilo de descarga</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-gray-600">¿En qué estilo deseas descargar la factura?</p>
            <div className="flex gap-4">
              <Button
                onClick={() => downloadInvoice('classic')}
                disabled={isDownloading}
                className="flex-1"
              >
                {isDownloading ? "Descargando..." : "Estilo Clásico"}
              </Button>
              <Button
                onClick={() => downloadInvoice('dian')}
                disabled={isDownloading}
                className="flex-1"
              >
                {isDownloading ? "Descargando..." : "Estilo DIAN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog
        open={showPdfPreview}
        onOpenChange={(open) => {
          setShowPdfPreview(open)
          if (!open && pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl)
            setPdfUrl(null)
          }
        }}
      >
        <DialogContent className="bg-white z-[100] max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="px-5 py-4 border-b border-gray-100 shrink-0 bg-white rounded-t-lg">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-base font-bold text-gray-800">
                Previsualización — Factura #{invoice.number}
              </DialogTitle>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowDownloadDialog(true)}
                className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-none h-8"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-0">
            {isPdfLoading ? (
              <div className="flex items-center justify-center h-full gap-3 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Cargando previsualización...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-b-2xl border-0"
                title={`Factura ${invoice.number}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No se pudo cargar el PDF
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Introduce el monto a pagar para la factura #{invoice.number}. El método de pago será Efectivo (CASH).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto del Pago</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={isPayingInvoice}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <div className="flex justify-between">
                <span>Saldo Pendiente:</span>
                <span className="font-semibold text-gray-900">${invoice.balanceDue.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={isPayingInvoice}>
              Cancelar
            </Button>
            <Button onClick={confirmPayment} disabled={isPayingInvoice || !paymentAmount} className="bg-green-600 hover:bg-green-700 text-white">
              {isPayingInvoice ? "Procesando..." : "Realizar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}