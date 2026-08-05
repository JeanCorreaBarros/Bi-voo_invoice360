// Tipos compartidos por las piezas del POS (page + diálogos de pago/turno/ticket).

export type PosProduct = {
  id: string
  name: string
  sku: string
  barcode: string | null
  type: "PRODUCT" | "SERVICE" | "KIT"
  unit: string | null
  price: number
  stock: number
  category: string | null
}

export type CartLine = {
  productId: string
  name: string
  sku: string
  unit: string | null
  price: number
  quantity: number
  stock: number
  type: PosProduct["type"]
}

export type PosCustomer = {
  id: string
  name: string
  nit: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}

export type PosSession = {
  id: string
  status: "OPEN" | "CLOSED"
  openingAmount: string | number
  expectedCashAmount: string | number | null
  countedCashAmount: string | number | null
  cashDifference: string | number | null
  note: string | null
  openedAt: string
  closedAt: string | null
  openedBy?: { id: string; name: string }
}

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "NEQUI" | "DAVIPLATA" | "OTHER"

export type PaymentLine = {
  key: string
  method: PaymentMethod
  amount: number
  reference?: string
}

export type SaleResult = {
  invoice: {
    id: number
    orderPrefix: string
    orderId: number
    orderReceiverName: string
    orderReceiverNit: string
    orderTotalAmountDue: string | number
    orderTotalBeforeTax: string | number
    orderTotalTax: string | number
    orderDate: string
    details: Array<{
      itemName: string | null
      orderItemQuantity: string | number
      orderItemPrice: string | number
      orderItemFinalAmount: string | number
    }>
  }
  payments: Array<{ method: PaymentMethod; amount: string | number; reference: string | null }>
  change: number
}

export type PosCompanyInfo = {
  businessName: string
  tradeName: string | null
  nit: string
  dv: string | null
  address: string | null
  city: string | null
  phone: string | null
}

export const CASH_DENOMINATIONS = [2000, 5000, 10000, 20000, 50000, 100000]

export function money(value: number | string | null | undefined) {
  const n = Number(value || 0)
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
}
