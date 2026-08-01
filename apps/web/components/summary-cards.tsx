"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Clock, Wallet, ArrowUpRight, Rocket } from "lucide-react"

interface DashboardApiData {
  salesToday: number
  salesMonth: number
  accountsReceivable: number
  overdueInvoices: number
  cashFlow: number
  topProducts: any[]
  // Potential trend data from API
  salesTrend?: number[]
  receivableTrend?: number[]
  overdueTrend?: number[]
}

const getTrailingMonths = () => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const result = []
  const today = new Date()
  for (let i = 3; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    result.push(months[d.getMonth()])
  }
  return result
}

const trailingMonths = getTrailingMonths()

const summaryDataTemplate = [
  {
    label: "Ventas del Mes",
    icon: TrendingUp,
    color: "text-[hsl(142,70%,45%)]",
    months: trailingMonths,
    chartPoints: [30, 50, 25, 65, 40, 75, 55, 80],
    key: "salesMonth",
    trendKey: "salesTrend",
    isCurrency: true
  },
  {
    label: "Cuentas por Cobrar",
    icon: ArrowUpRight,
    color: "text-[hsl(45,100%,60%)]",
    months: trailingMonths,
    chartPoints: [20, 45, 60, 35, 55, 70, 45, 85],
    key: "accountsReceivable",
    trendKey: "receivableTrend",
    isCurrency: true
  },
  {
    label: "Facturas Vencidas",
    suffix: "facturas",
    icon: Clock,
    color: "text-[hsl(0,84%,60%)]",
    months: trailingMonths,
    chartPoints: [50, 40, 65, 30, 55, 45, 70, 60],
    key: "overdueInvoices",
    trendKey: "overdueTrend",
    isCurrency: false
  },
]

const payoutDataTemplate = {
  label: "Flujo de Caja",
  expects: "Total",
  key: "cashFlow",
}

const MAX_TOP_PRODUCTS = 5;

function MiniChart({ points }: { points: number[] }) {
  const width = 200
  const height = 40
  const maxVal = Math.max(...points)
  const step = width / (points.length - 1)

  const pathData = points
    .map((p, i) => {
      const x = i * step
      const y = height - (p / maxVal) * height
      return `${i === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  const areaPath = `${pathData} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(228,10%,35%)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(228,10%,20%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <path d={pathData} fill="none" stroke="hsl(228,10%,40%)" strokeWidth="1.5" />
    </svg>
  )
}

export function SummaryCards() {
  const [data, setData] = useState<DashboardApiData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showTopProductsModal, setShowTopProductsModal] = useState(false)
  const [modalData, setModalData] = useState<{ product: string; quantity: number }[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        const token = sessionStorage.getItem("token")

        if (!token) {
          throw new Error("Token de autenticación no encontrado")
        }

        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}dashboard`
        const response = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error("Error fetching dashboard data")
        const result = await response.json()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fetch modal data when it opens
  useEffect(() => {
    if (showTopProductsModal) {
      const fetchModalData = async () => {
        try {
          setModalLoading(true)
          const token = sessionStorage.getItem("token")
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}dashboard/top-products`
          const response = await fetch(apiUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (!response.ok) throw new Error("Error fetching modal data")
          const result = await response.json()
          if (result.ok) {
            setModalData(result.data)
          }
        } catch (err) {
          console.error("Error fetching top products modal:", err)
        } finally {
          setModalLoading(false)
        }
      }
      fetchModalData()
    }
  }, [showTopProductsModal])

  // Formatear números como moneda sin decimales si son ,00
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  // Obtener tamaño de fuente dinámico basado en la longitud del texto
  const getFontSize = (text: string, isBigCard = false) => {
    const length = text.length
    if (isBigCard) {
      if (length > 12) return "text-xl"
      if (length > 10) return "text-2xl"
      return "text-3xl"
    }
    if (length > 12) return "text-lg"
    if (length > 10) return "text-xl"
    if (length > 8) return "text-2xl"
    return "text-3xl"
  }

  // Construir datos dinámicos con información de la API
  const summaryData = summaryDataTemplate.map((template) => {
    if (!data) return { ...template, amount: "0", isCurrency: template.isCurrency }

    let value = 0;
    if (template.key === "salesMonth") value = data.salesMonth;
    if (template.key === "accountsReceivable") value = data.accountsReceivable;
    if (template.key === "overdueInvoices") value = data.overdueInvoices;

    // Use real trend data if available, otherwise use a simulated trend that ends at the real value
    const realTrend = (data as any)[template.trendKey as string]
    let displayPoints = template.chartPoints
    
    if (realTrend && Array.isArray(realTrend) && realTrend.length > 0) {
      displayPoints = realTrend
    } else if (value > 0) {
      // Simulate a "real" trend: 0 for previous months, then the value for the current month
      // We create a line that stays at 0 and only rises at the end
      displayPoints = [0, 0, 0, 0, 0, 0, value * 0.1, value]
    } else {
      // No movements = Flat line at zero
      displayPoints = [0, 0, 0, 0, 0, 0, 0, 0]
    }

    return {
      ...template,
      amount: template.isCurrency ? formatCurrency(value) : String(value),
      chartPoints: displayPoints
    }
  })

  const payoutData = data
    ? {
      ...payoutDataTemplate,
      amount: formatCurrency(data.cashFlow),
    }
    : { ...payoutDataTemplate, amount: "0.00" }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500 bg-red-50 p-5">
        <p className="text-red-700">Error al cargar datos: {error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Metric Cards */}
      {summaryData.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border shadow-xl hover:scale-95 border-border bg-card p-5 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-black font-semibold text-xs font-sans tracking-wide uppercase opacity-70">{item.label}</span>
            <div className={`p-1.5 rounded-lg ${item.color.replace('text-', 'bg-').replace(')]', ',0.15)')}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2 overflow-hidden">
            {item.isCurrency && <span className="text-[hsl(0,0%,55%)] text-sm font-sans">$</span>}
            <span className={`${getFontSize(item.amount)} font-extrabold text-[hsl(209,83%,23%)] font-sans tracking-tight transition-all duration-300`}>
              {item.amount}
            </span>
            {item.suffix && (
              <span className="text-sm font-medium text-gray-500 font-sans ml-0.5">{item.suffix}</span>
            )}
          </div>
          {/* Mini line chart */}
          <MiniChart points={item.chartPoints} />
          {/* Month labels */}
          <div className="flex items-center justify-between px-0.5">
            {item.months.map((m) => (
              <span key={m} className="text-[10px] text-muted-foreground font-sans">
                {m}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Payout Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex flex-col justify-between min-h-[160px] hover:scale-95 transition-all shadow-xl group">
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-black text-[10px] font-black font-sans uppercase tracking-widest">{payoutData.label}</span>
          <span className="text-[10px] text-muted-foreground font-sans bg-gray-100 px-2 py-0.5 rounded-full">{payoutData.expects}</span>
        </div>

        <div className="relative z-10 flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className={`${getFontSize(payoutData.amount, true)} font-black text-[hsl(209,83%,23%)] font-sans tracking-tight transition-all duration-300 truncate mr-2`}>
              ${payoutData.amount}
            </span>
          </div>
        </div>

        {/* Watermark Logo */}
        <div className="absolute -bottom-4 -right-4 w-32 h-32 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-500">
          <Rocket className="w-full h-full text-[hsl(209,83%,23%)]" />
        </div>
        {/* Payment methods */}
        <div className="flex hidden flex-wrap items-center gap-2 mt-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm">
            <Wallet className="h-3.5 w-3.5 text-white" />
            <span className="text-white font-sans text-xs">Visa</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(209,83%,23%)] text-sm">
            <span className="text-[hsl(0,0%,100%)] font-sans text-xs font-medium">#177210</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm">
            <span className="text-[hsl(0,0%,100%)] font-sans text-xs">#711221</span>
          </div>
        </div>
        <div className="flex hidden flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm">
            <span className="text-[hsl(0,0%,100%)] font-sans text-xs">Stripe</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm">
            <span className="text-[hsl(0,0%,100%)] font-sans text-xs">PayPal</span>
          </div>
        </div>
        <button
          type="button"
          className="mt-auto hidden self-end px-4 hover:scale-95 py-2 rounded-lg bg-[hsl(209,83%,23%)] text-[hsl(0,0%,100%)] text-sm font-medium font-sans hover:bg-[hsl(209,81%,33%)] transition-colors"
        >
          Pagar ahora
        </button>
      </div>

      {/* Top Products Card */}
      {data && data.topProducts && data.topProducts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between min-h-[160px] shadow-xl xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-black text-[10px] font-black font-sans uppercase tracking-widest">Productos más vendidos</span>
            <span className="text-[10px] text-muted-foreground font-sans bg-gray-100 px-2 py-0.5 rounded-full">Top {data.topProducts.length}</span>
          </div>
          <div className="flex-1 flex items-end gap-2 h-full mt-2 justify-center mb-4">
            {data.topProducts.map((p, i) => {
              const maxQuantity = Math.max(...data.topProducts.map(tp => tp.quantity));
              const heightPercentage = Math.max(10, (p.quantity / maxQuantity) * 100);
              return (
                <div key={p.productId || i} className="group relative flex flex-col items-center justify-end flex-1 h-24">
                  <div className="absolute -top-10 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                    <p className="font-bold">{p.productName || "Producto"}</p>
                    <p>{p.quantity} unidades</p>
                  </div>
                  <div
                    className="w-full bg-[hsl(209,83%,23%)] rounded-t-lg opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                    style={{ height: `${heightPercentage}%` }}
                  ></div>
                  <span className="text-[8px] text-muted-foreground mt-1 truncate w-full text-center font-bold px-0.5" title={p.productName}>
                    {p.productName?.split(' ')[0] || "Prod"}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowTopProductsModal(true)}
            className="w-full py-2 rounded-xl bg-[hsl(209,83%,23%)] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
          >
            Ver detalles
          </button>
        </div>
      )}

      {/* Top Products Modal */}
      {showTopProductsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTopProductsModal(false)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[hsl(209,83%,23%)] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans tracking-tight">Ranking de Productos</h3>
                  <p className="text-white/60 text-xs font-medium">Análisis detallado de ventas por ítem</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopProductsModal(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Clock className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-10 h-10 border-4 border-[hsl(209,83%,23%)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Cargando reporte...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[hsl(209,83%,23%,0.2)] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[hsl(209,83%,23%)] text-white flex items-center justify-center font-black text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.product}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[hsl(209,83%,23%)]"
                              style={{ width: `${(item.quantity / modalData[0].quantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-[hsl(209,83%,23%)]">{item.quantity}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowTopProductsModal(false)}
                className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
