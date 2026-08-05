"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Lock,
  Unlock,
  ScanBarcode,
  PackageX,
} from "lucide-react"
import { PosOpenShiftDialog, PosCloseShiftDialog } from "./pos-shift-dialogs"
import { PosPaymentDialog, type PosPaymentPayload } from "./pos-payment-dialog"
import { PosTicketDialog } from "./pos-ticket-dialog"
import type { CartLine, PosCompanyInfo, PosCustomer, PosProduct, PosSession, SaleResult } from "./pos-types"
import { money } from "./pos-types"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

async function authFetch(path: string, init?: RequestInit) {
  const token = getToken()
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || "Error de red")
  }
  return data
}

export default function PosPage() {
  const { user } = useAuth()
  const [company, setCompany] = useState<PosCompanyInfo | null>(null)
  const [session, setSession] = useState<PosSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [openShiftDialog, setOpenShiftDialog] = useState(false)
  const [closeShiftDialog, setCloseShiftDialog] = useState(false)

  const [products, setProducts] = useState<PosProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const [cart, setCart] = useState<CartLine[]>([])
  const [customers, setCustomers] = useState<PosCustomer[]>([])

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [lastSale, setLastSale] = useState<SaleResult | null>(null)

  // ── Carga inicial: turno actual + clientes ──
  const loadSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const data = await authFetch("pos/shifts/current")
      setSession(data.session)
    } catch (err: any) {
      toast.error(err.message || "No se pudo cargar el turno de caja")
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
    authFetch("customers").then((data) => {
      const arr = Array.isArray(data) ? data : data?.data ?? []
      setCustomers(arr.filter((c: any) => c.active !== false))
    }).catch(() => {})
    authFetch("pos/company-info").then((data) => {
      if (data.company) setCompany(data.company)
    }).catch(() => {})
  }, [loadSession])

  // ── Búsqueda de productos (con debounce) — reutiliza el mismo campo para lector de código de barras ──
  const runSearch = useCallback(async (q: string) => {
    setProductsLoading(true)
    try {
      const data = await authFetch(`pos/products?q=${encodeURIComponent(q)}&limit=40`)
      setProducts(data.products || [])
    } catch (err: any) {
      toast.error(err.message || "No se pudieron cargar los productos")
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 250)
    return () => clearTimeout(t)
  }, [search, runSearch])

  // Mantener el foco en el buscador para que un lector de código de barras
  // (que "escribe" y presiona Enter) siempre tenga dónde escribir, salvo
  // que el usuario esté escribiendo en otro campo (diálogo de pago, etc).
  useEffect(() => {
    if (paymentOpen || openShiftDialog || closeShiftDialog) return
    const id = setInterval(() => {
      const active = document.activeElement
      if (active && active.tagName === "INPUT" && active !== searchRef.current) return
      searchRef.current?.focus()
    }, 600)
    return () => clearInterval(id)
  }, [paymentOpen, openShiftDialog, closeShiftDialog])

  const addToCart = (product: PosProduct) => {
    if (product.type === "PRODUCT" && product.stock <= 0) {
      toast.error(`Sin stock disponible: ${product.name}`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        const nextQty = existing.quantity + 1
        if (product.type === "PRODUCT" && nextQty > product.stock) {
          toast.error(`Solo hay ${product.stock} unidades de ${product.name}`)
          return prev
        }
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: nextQty } : l))
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          type: product.type,
        },
      ]
    })
  }

  const updateQty = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l
          const clamped = l.type === "PRODUCT" ? Math.min(quantity, l.stock) : quantity
          return { ...l, quantity: Math.max(1, clamped) }
        })
        .filter((l) => l.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId))

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (!search.trim()) return

    const exactBarcode = products.find((p) => p.barcode && p.barcode === search.trim())
    const best = exactBarcode || products[0]

    if (best) {
      addToCart(best)
      setSearch("")
    } else {
      toast.error("No se encontró ningún producto")
    }
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0)
    const iva = subtotal * 0.19
    return { subtotal, iva, total: subtotal + iva }
  }, [cart])

  const handleCreateCustomer = async (data: { name: string; nit: string; phone?: string }) => {
    const created = await authFetch("customers", {
      method: "POST",
      body: JSON.stringify(data),
    })
    setCustomers((prev) => [...prev, created])
    return created as PosCustomer
  }

  const handleConfirmSale = async (payload: PosPaymentPayload) => {
    setSaleLoading(true)
    try {
      const data = await authFetch("pos/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          payments: payload.payments,
          note: payload.note,
          customer: payload.customer,
        }),
      })
      setLastSale(data)
      setCart([])
      setPaymentOpen(false)
      runSearch(search)
    } catch (err: any) {
      toast.error(err.message || "No se pudo registrar la venta")
    } finally {
      setSaleLoading(false)
    }
  }

  return (
    <div id="pos-page-root" className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <DashboardHeader />

      {/* Barra de turno */}
      <div className="border-b border-gray-100 bg-white px-4 lg:px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4 text-[hsl(209,79%,35%)]" />
          <span className="font-semibold text-gray-900">Punto de venta</span>
          {!sessionLoading && (
            <Badge variant={session ? "secondary" : "outline"} className="ml-2 font-normal">
              {session ? `Turno abierto · ${session.openedBy?.name || "—"}` : "Sin turno abierto"}
            </Badge>
          )}
        </div>
        {!sessionLoading && (
          session ? (
            <Button variant="outline" size="sm" onClick={() => setCloseShiftDialog(true)}>
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Cerrar turno
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setOpenShiftDialog(true)}>
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Abrir turno
            </Button>
          )
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
        {/* Catálogo */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="relative">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, SKU o escanear código de barras..."
              className="pl-9 h-11 bg-white"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                disabled={p.type === "PRODUCT" && p.stock <= 0}
                className="text-left bg-white border border-gray-100 rounded-xl p-3 hover:border-[hsl(209,79%,35%)] hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-[hsl(209,79%,35%)]">{money(p.price)}</span>
                  {p.type === "PRODUCT" && (
                    <span className={`text-[11px] ${p.stock <= 5 ? "text-amber-600" : "text-gray-400"}`}>
                      {p.stock} {p.unit || "UND"}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {!productsLoading && products.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-400">
                <PackageX className="h-8 w-8 mx-auto mb-2" />
                No se encontraron productos
              </div>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div className="w-full lg:w-[380px] shrink-0 bg-white border border-gray-100 rounded-xl flex flex-col lg:sticky lg:top-4 lg:min-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-160px)]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Carrito</p>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-gray-400 hover:text-red-500">
                Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {cart.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10 px-4">
                Toca un producto o escanea un código de barras para agregarlo.
              </p>
            )}
            {cart.map((line) => (
              <div key={line.productId} className="px-4 py-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{line.name}</p>
                  <p className="text-xs text-gray-400">{money(line.price)} c/u</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => updateQty(line.productId, line.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{line.quantity}</span>
                    <button
                      onClick={() => updateQty(line.productId, line.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">{money(line.price * line.quantity)}</span>
                  <button onClick={() => removeFromCart(line.productId)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA</span>
              <span>{money(totals.iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
            <Button
              className="w-full mt-2 h-11"
              disabled={cart.length === 0}
              onClick={() => (session ? setPaymentOpen(true) : setOpenShiftDialog(true))}
            >
              Cobrar
            </Button>
          </div>
        </div>
      </div>

      <PosOpenShiftDialog
        open={!sessionLoading && !session && openShiftDialog}
        onOpenChange={setOpenShiftDialog}
        onOpened={() => {
          // Recarga desde el servidor (en vez de usar la respuesta cruda del
          // POST) para traer `openedBy` incluido y mostrar el nombre del
          // cajero en el badge del turno.
          setOpenShiftDialog(false)
          loadSession()
        }}
      />

      <PosCloseShiftDialog
        open={closeShiftDialog}
        session={session}
        onOpenChange={setCloseShiftDialog}
        onClosed={() => {
          setCloseShiftDialog(false)
          setSession(null)
          setOpenShiftDialog(true)
        }}
      />

      <PosPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        cart={cart}
        customers={customers}
        loading={saleLoading}
        onConfirm={handleConfirmSale}
        onCreateCustomer={handleCreateCustomer}
      />

      <PosTicketDialog
        open={!!lastSale}
        sale={lastSale}
        company={company}
        cashierName={user?.name || null}
        onClose={() => setLastSale(null)}
      />
    </div>
  )
}
