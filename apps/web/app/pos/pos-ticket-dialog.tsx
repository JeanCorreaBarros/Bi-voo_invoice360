"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Printer, Plus } from "lucide-react"
import type { PosCompanyInfo, SaleResult } from "./pos-types"
import { money } from "./pos-types"

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  OTHER: "Otro",
}

export function PosTicketDialog({
  open,
  sale,
  company,
  cashierName,
  onClose,
}: {
  open: boolean
  sale: SaleResult | null
  company: PosCompanyInfo | null
  cashierName: string | null
  onClose: () => void
}) {
  if (!sale) return null
  const { invoice, payments, change } = sale

  const companyName = company?.tradeName || company?.businessName || "Bi360 by Bi-voo"
  const companyNit = company ? `${company.nit}${company.dv ? "-" + company.dv : ""}` : null
  const companyLocation = [company?.address, company?.city].filter(Boolean).join(", ")

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <div className="bg-green-50 px-6 py-5 flex flex-col items-center text-center border-b border-green-100 print:hidden">
          <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
          <DialogTitle className="font-bold text-lg text-gray-900">Venta registrada</DialogTitle>
          <p className="text-sm text-gray-500">
            Factura {invoice.orderPrefix}-{invoice.orderId}
          </p>
        </div>

        <div id="pos-ticket-print" className="px-6 py-4 space-y-2 max-h-[50vh] overflow-y-auto font-mono text-xs bg-white text-black">
          {/* Encabezado: empresa */}
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">{companyName}</p>
            {companyNit && <p>NIT: {companyNit}</p>}
            {companyLocation && <p>{companyLocation}</p>}
            {company?.phone && <p>Tel: {company.phone}</p>}
          </div>

          {/* Encabezado: venta */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
            <p>Factura: {invoice.orderPrefix}-{invoice.orderId}</p>
            <p>Fecha: {new Date(invoice.orderDate).toLocaleString("es-CO")}</p>
            {cashierName && <p>Cajero: {cashierName}</p>}
            <p>Cliente: {invoice.orderReceiverName}</p>
            <p>Identificación: {invoice.orderReceiverNit}</p>
          </div>

          {/* Productos */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
            <div className="flex justify-between font-bold">
              <span>Producto</span>
              <span>Total</span>
            </div>
            {invoice.details.map((d, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="flex-1 truncate">
                  {Number(d.orderItemQuantity)} x {d.itemName}
                </span>
                <span className="shrink-0">{money(d.orderItemFinalAmount)}</span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(invoice.orderTotalBeforeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuentos</span>
              <span>{money(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA</span>
              <span>{money(invoice.orderTotalTax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-400 pt-1">
              <span>Total</span>
              <span>{money(invoice.orderTotalAmountDue)}</span>
            </div>
          </div>

          {/* Información tributaria */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
            <p className="text-center font-semibold">[ Información Tributaria ]</p>
            <div className="flex justify-between text-[11px]">
              <span>Descripción</span>
              <span>Vlr. Base</span>
              <span>Vlr. Impto</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>IVA 19%</span>
              <span>{money(invoice.orderTotalBeforeTax)}</span>
              <span>{money(invoice.orderTotalTax)}</span>
            </div>
          </div>

          {/* Pagos */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                <span>{money(p.amount)}</span>
              </div>
            ))}
            {change > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Cambio</span>
                <span>{money(change)}</span>
              </div>
            )}
          </div>

          <p className="text-center border-t border-dashed border-gray-400 pt-2">¡Gracias por su compra!</p>
        </div>

        <div className="px-6 pb-6 pt-2 flex gap-2 print:hidden">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button className="flex-1" onClick={onClose}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva venta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
