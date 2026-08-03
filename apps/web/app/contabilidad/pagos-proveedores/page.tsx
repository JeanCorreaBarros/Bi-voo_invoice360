"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Wallet, Search } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Purchase = {
  id: number
  supplierName: string
  invoiceNumber: string | null
  total: string
  status: string
  date: string
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number | string) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`
}

const selectClass =
  "h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

const PAGE_SIZE = 20

export default function PagosProveedoresPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("CASH")
  const [reference, setReference] = useState("")

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchPurchases = async (targetPage: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(targetPage) })
      if (search.trim()) params.set("supplier", search.trim())
      const res = await fetch(`${apiBase}purchases?${params.toString()}`, { headers: authHeaders() })
      const data = await res.json()
      const list: Purchase[] = data?.data ?? []
      setTotalPages(data?.totalPages ?? 1)
      setPage(targetPage)
      setPurchases((prev) => (append ? [...prev, ...list] : list))

      const balanceEntries = await Promise.all(
        list.map(async (p) => {
          const r = await fetch(`${apiBase}purchase-payments/${p.id}/balance`, { headers: authHeaders() })
          const b = await r.json()
          return [p.id, b?.data?.balance ?? Number(p.total)] as const
        })
      )
      setBalances((prev) => ({ ...prev, ...Object.fromEntries(balanceEntries) }))
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar compras")
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => fetchPurchases(1, false), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openPayModal = (purchase: Purchase) => {
    setSelected(purchase)
    setAmount("")
    setMethod("CASH")
    setReference("")
    setIsModalOpen(true)
  }

  const handlePay = async () => {
    if (!selected || !amount) {
      toast.error("Ingresa un monto")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}purchase-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ purchaseId: selected.id, amount: Number(amount), method, reference: reference || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al registrar el pago")
        return
      }
      toast.success("Pago registrado")
      setIsModalOpen(false)
      await fetchPurchases(1, false)
    } catch {
      toast.error("Error al registrar el pago")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pagos a Proveedores</h1>
        <p className="text-sm text-gray-500">Cuentas por pagar — saldo pendiente por compra</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9 h-11 rounded-xl"
          placeholder="Buscar por proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : purchases.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay compras registradas</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Proveedor", "Factura", "Total", "Saldo", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.map((p) => {
                const balance = balances[p.id] ?? Number(p.total)
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{p.supplierName}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{p.invoiceNumber || "—"}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(p.total)}</td>
                    <td className="px-5 py-3 text-sm text-right font-semibold whitespace-nowrap">
                      <span className={balance > 0 ? "text-orange-600" : "text-green-600"}>{money(balance)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {balance > 0 && p.status !== "CANCELLED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.08)]"
                          onClick={() => openPayModal(p)}
                        >
                          <Wallet className="h-4 w-4 mr-1" /> Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {page < totalPages && (
          <div className="border-t border-gray-100 p-3 text-center">
            <Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => fetchPurchases(page + 1, true)}>
              {loadingMore ? "Cargando..." : "Cargar más"}
            </Button>
          </div>
        )}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              Pagar a {selected?.supplierName}
            </DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Monto</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl border-gray-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Método</Label>
              <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
                <option value="NEQUI">Nequi</option>
                <option value="DAVIPLATA">Daviplata</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Referencia (opcional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} className="h-12 rounded-xl border-gray-200" />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
              Cancelar
            </Button>
            <Button onClick={handlePay} disabled={saving} className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50">
              {saving ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
