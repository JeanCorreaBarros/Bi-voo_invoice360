"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import {
  Boxes,
  DollarSign,
  AlertTriangle,
  PackageX,
  TrendingUp,
  TrendingDown,
  Repeat,
} from "lucide-react"

import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Dashboard = {
  totalProducts: number
  totalValue: number
  agotados: { id: string; name: string; sku: string; stock: number }[]
  bajoStock: { id: string; name: string; sku: string; stock: number; minStock: number }[]
  sobreStock: { id: string; name: string; sku: string; stock: number; maxStock: number }[]
  masVendidos: { productId: string; name: string; sku?: string; quantity: number }[]
  menosVendidos: { productId: string; name: string; sku?: string; quantity: number }[]
  rotacion: number
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-CO")}`
}

const INV_ANALISIS_DEFAULT =
  "Analiza el estado del inventario (valor total, productos agotados, próximos a agotarse, sobrestock y rotación) y explica en lenguaje sencillo qué necesita atención y por qué."

export default function InventarioDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const { enabled: iaEnabled, prompt: iaPrompt } = useAiEvent("inv_analisis_inventario", INV_ANALISIS_DEFAULT)
  const [iaResult, setIaResult] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}inventory/dashboard`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al cargar el resumen")
      setData(result.data)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar el resumen de inventario")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const buildContext = () => {
    if (!data) return ""
    return [
      `Total de productos: ${data.totalProducts}`,
      `Valor total del inventario: ${money(data.totalValue)}`,
      `Productos agotados (${data.agotados.length}): ${data.agotados.map((p) => p.name).join(", ") || "ninguno"}`,
      `Próximos a agotarse (${data.bajoStock.length}): ${data.bajoStock.map((p) => `${p.name} (${p.stock}/${p.minStock})`).join(", ") || "ninguno"}`,
      `Con sobrestock (${data.sobreStock.length}): ${data.sobreStock.map((p) => `${p.name} (${p.stock}/${p.maxStock})`).join(", ") || "ninguno"}`,
      `Rotación (ventas 30 días / stock promedio): ${data.rotacion}`,
      `Más vendidos: ${data.masVendidos.map((p) => `${p.name} (${p.quantity})`).join(", ") || "sin ventas"}`,
      `Menos vendidos: ${data.menosVendidos.map((p) => `${p.name} (${p.quantity})`).join(", ") || "sin ventas"}`,
    ].join("\n")
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">Resumen de existencias, valor y alertas</p>
        </div>
        {iaEnabled && (
          <AiSuggestButton
            prompt={iaPrompt}
            context={buildContext()}
            onResult={setIaResult}
            label="Analizar inventario con IA"
          />
        )}
      </div>

      {iaResult && <AiResultPanel text={iaResult} onClose={() => setIaResult(null)} color="blue" />}

      {loading || !data ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Boxes className="h-4 w-4" /> Productos
              </div>
              <p className="text-2xl font-black text-gray-900">{data.totalProducts}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                <DollarSign className="h-4 w-4" /> Valor inventario
              </div>
              <p className="text-2xl font-black text-gray-900">{money(data.totalValue)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                <PackageX className="h-4 w-4" /> Agotados
              </div>
              <p className="text-2xl font-black text-red-600">{data.agotados.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Repeat className="h-4 w-4" /> Rotación (30d)
              </div>
              <p className="text-2xl font-black text-gray-900">{data.rotacion}x</p>
            </div>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-bold text-gray-800">Agotados</p>
              </div>
              {data.agotados.length === 0 ? (
                <p className="text-xs text-gray-400">Sin productos agotados</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.agotados.slice(0, 8).map((p) => (
                    <li key={p.id} className="text-xs text-gray-600 flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-gray-400 ml-2">{p.sku}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-bold text-gray-800">Próximos a agotarse</p>
              </div>
              {data.bajoStock.length === 0 ? (
                <p className="text-xs text-gray-400">Sin alertas de stock bajo</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.bajoStock.slice(0, 8).map((p) => (
                    <li key={p.id} className="text-xs text-gray-600 flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="font-bold text-amber-600 ml-2">{p.stock}/{p.minStock}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-violet-500" />
                <p className="text-sm font-bold text-gray-800">Sobrestock</p>
              </div>
              {data.sobreStock.length === 0 ? (
                <p className="text-xs text-gray-400">Sin alertas de sobrestock</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.sobreStock.slice(0, 8).map((p) => (
                    <li key={p.id} className="text-xs text-gray-600 flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="font-bold text-violet-600 ml-2">{p.stock}/{p.maxStock}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Top / bottom sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-bold text-gray-800">Más vendidos (30 días)</p>
              </div>
              {data.masVendidos.length === 0 ? (
                <p className="text-xs text-gray-400">Sin ventas registradas</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.masVendidos.map((p) => (
                    <li key={p.productId} className="text-xs text-gray-600 flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="font-bold text-emerald-600 ml-2">{p.quantity} uds</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-bold text-gray-800">Menos vendidos (30 días)</p>
              </div>
              {data.menosVendidos.length === 0 ? (
                <p className="text-xs text-gray-400">Sin ventas registradas</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.menosVendidos.map((p) => (
                    <li key={p.productId} className="text-xs text-gray-600 flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="font-bold text-gray-500 ml-2">{p.quantity} uds</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
