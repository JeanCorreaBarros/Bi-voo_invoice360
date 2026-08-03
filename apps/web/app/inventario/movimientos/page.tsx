"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Movement = {
  id: string
  date: string
  productId: string
  product: string
  sku: string
  type: string
  quantity: number
  direction: "IN" | "OUT"
  reference: string | null
  referenceId: number | null
  reason: string | null
  user: string | null
}

const TYPE_LABELS: Record<string, string> = {
  IN: "Entrada manual",
  OUT: "Salida manual",
  ADJUST: "Ajuste (conteo)",
  ADJUSTMENT: "Ajuste",
  PURCHASE: "Compra",
  SALE: "Venta",
  RETURN: "Devolución",
  TRANSFORM_IN: "Transformación (entrada)",
  TRANSFORM_OUT: "Transformación (salida)",
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

export default function MovimientosInventarioPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 30

  const fetchMovements = async (targetPage: number, append: boolean) => {
    setLoading(true)
    try {
      const token = getToken()
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) })
      if (search.trim()) params.set("search", search.trim())
      if (type) params.set("type", type)

      const res = await fetch(`${apiBase}inventory/kardex?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al cargar movimientos")

      setMovements((prev) => (append ? [...prev, ...result.data] : result.data))
      setTotalPages(result.totalPages)
      setTotal(result.total)
      setPage(targetPage)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar movimientos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Movimientos (Kardex)</h1>
        <p className="text-sm text-gray-500">Historial de entradas y salidas de inventario — {total} movimiento(s)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por producto o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 rounded-xl border-gray-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setType("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              type === "" ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                type === key ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          {loading && movements.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No hay movimientos registrados</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-100">
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Referencia", "Motivo", "Usuario"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(m.date).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{m.product}</p>
                      <p className="text-[11px] font-mono text-gray-400">{m.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                        {m.direction === "IN" ? (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        {TYPE_LABELS[m.type] || m.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${m.direction === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                      {m.direction === "IN" ? "+" : "-"}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {m.reference ? `${m.reference}${m.referenceId ? ` #${m.referenceId}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{m.reason || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{m.user || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {page < totalPages && (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <Button variant="outline" size="sm" disabled={loading} onClick={() => fetchMovements(page + 1, true)}>
              {loading ? "Cargando..." : "Cargar más"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
