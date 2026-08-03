"use client"

import { useState } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Download,
  FileText,
  PieChart,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  FileSpreadsheet,
  Calendar,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

type FormatoDescarga = "PDF" | "Excel" | "ZIP"

interface Descarga {
  tipo: FormatoDescarga
  endpoint: string
}

interface ReporteConfig {
  id: string
  nombre: string
  descripcion: string
  icon: any
  usarFechas?: boolean
  usarFechaCorte?: boolean
  descargas: Descarga[]
}

const REPORTES: ReporteConfig[] = [
  {
    id: "resumen_ventas",
    nombre: "Resumen de Ventas",
    descripcion: "Facturas emitidas en el periodo, con subtotales e impuestos",
    icon: TrendingUp,
    usarFechas: true,
    descargas: [
      { tipo: "PDF", endpoint: "reports-sales/export/pdf" },
      { tipo: "Excel", endpoint: "reports-sales/export/excel" },
      { tipo: "ZIP", endpoint: "reports-sales/export/zip" },
    ],
  },
  {
    id: "balance_general",
    nombre: "Balance General",
    descripcion: "Activo, pasivo y patrimonio de la empresa a la fecha de corte",
    icon: PieChart,
    usarFechaCorte: true,
    descargas: [
      { tipo: "PDF", endpoint: "accounting/reports/balance-sheet/export/pdf" },
      { tipo: "Excel", endpoint: "accounting/reports/balance-sheet/export/excel" },
    ],
  },
  {
    id: "estado_resultados",
    nombre: "Estado de Resultados",
    descripcion: "Ingresos, costos y gastos del periodo, con la utilidad neta",
    icon: BarChart3,
    usarFechas: true,
    descargas: [
      { tipo: "PDF", endpoint: "accounting/reports/income-statement/export/pdf" },
      { tipo: "Excel", endpoint: "accounting/reports/income-statement/export/excel" },
    ],
  },
  {
    id: "balance_comprobacion",
    nombre: "Balance de Comprobación",
    descripcion: "Saldos deudores y acreedores de todas las cuentas contables",
    icon: FileText,
    descargas: [{ tipo: "Excel", endpoint: "accounting/reports/trial-balance/export/excel" }],
  },
  {
    id: "resumen_compras",
    nombre: "Resumen de Compras",
    descripcion: "Compras registradas a proveedores en el periodo seleccionado",
    icon: ShoppingCart,
    usarFechas: true,
    descargas: [{ tipo: "Excel", endpoint: "purchases/export/excel" }],
  },
]

function formatoBadgeIcon(tipo: FormatoDescarga) {
  if (tipo === "Excel") return <FileSpreadsheet className="w-3 h-3" />
  return <Download className="w-3 h-3" />
}

function formatoEstilo(tipo: FormatoDescarga) {
  if (tipo === "PDF")
    return "bg-white border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
  if (tipo === "Excel")
    return "bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
  return "bg-white border-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-200"
}

function formatoExtension(tipo: FormatoDescarga) {
  if (tipo === "PDF") return "pdf"
  if (tipo === "Excel") return "xlsx"
  return "zip"
}

export default function ReportesPage() {
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)

  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return primerDiaMes.toISOString().split("T")[0]
  })

  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    const hoy = new Date()
    return hoy.toISOString().split("T")[0]
  })

  const handleDescargar = async (reporte: ReporteConfig, descarga: Descarga) => {
    const key = `${reporte.id}-${descarga.tipo}`
    try {
      setDownloadingKey(key)
      setError(null)

      const token = sessionStorage.getItem("token")
      if (!token) {
        setError("No autorizado. Por favor inicia sesión nuevamente.")
        return
      }

      if (reporte.usarFechas && (!fechaDesde || !fechaHasta)) {
        setError("Selecciona ambas fechas para este reporte")
        return
      }

      if (reporte.usarFechas && new Date(fechaDesde) > new Date(fechaHasta)) {
        setError("La fecha inicial no puede ser mayor a la fecha final")
        return
      }

      const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/").replace(
        /\/?$/,
        "/"
      )

      const params = new URLSearchParams()
      if (reporte.usarFechas) {
        params.append("from", fechaDesde)
        params.append("to", fechaHasta)
      }
      if (reporte.usarFechaCorte) {
        params.append("asOf", fechaHasta)
      }

      const queryString = params.toString()
      const fullUrl = `${apiBaseUrl}${descarga.endpoint}${queryString ? `?${queryString}` : ""}`

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        let message = `Error ${response.status} al descargar`
        try {
          const body = await response.json()
          message = body?.message || body?.error || message
        } catch {
          // la respuesta no era JSON, se conserva el mensaje genérico
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${reporte.id}_${new Date().toLocaleDateString("es-CO").replace(/\//g, "-")}.${formatoExtension(descarga.tipo)}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${descarga.tipo} descargado correctamente`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Error al descargar ${descarga.tipo}`
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setDownloadingKey(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-6">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Reportes</h1>
          <p className="text-slate-500 mt-1">Genera y descarga los reportes de tu empresa</p>
        </div>

        {/* Filtro de Fechas - Acordeón elegante */}
        <div className="mb-6 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showFilters ? "bg-blue-100" : "bg-slate-100"}`}
              >
                <SlidersHorizontal
                  className={`h-4 w-4 transition-colors ${showFilters ? "text-blue-600" : "text-slate-500"}`}
                />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-slate-700 block">Rango de fechas</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                  {showFilters ? "Haz clic para ocultar" : "Haz clic para expandir"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!showFilters && (
                <div className="hidden md:flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(fechaDesde).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} -{" "}
                    {new Date(fechaHasta).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </div>
                </div>
              )}
              {showFilters ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
          </button>

          <motion.div
            initial={false}
            animate={{ height: showFilters ? "auto" : 0, opacity: showFilters ? 1 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="desde" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">
                    Fecha Inicio
                  </Label>
                  <Input
                    id="desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hasta" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">
                    Fecha Fin / Fecha de Corte
                  </Label>
                  <Input
                    id="hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors h-10"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 ml-1">
                Aplica a los reportes que usan un rango de fechas o una fecha de corte (Balance General).
              </p>
            </div>
          </motion.div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl mb-6 flex items-center gap-3"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center text-rose-700">
              <span className="font-bold">!</span>
            </div>
            <div className="text-sm">
              <p className="font-bold text-rose-900">Error detectado</p>
              <p className="opacity-80">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Reportes Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map((reporte, index) => (
            <motion.div
              key={reporte.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group overflow-hidden border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-300 h-full bg-white">
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Upper Section */}
                  <div className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 transition-colors group-hover:bg-blue-50 group-hover:border-blue-100">
                      <reporte.icon className="w-5 h-5 md:w-6 md:h-6 text-slate-600 transition-colors group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-blue-700 transition-colors">
                        {reporte.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 italic">{reporte.descripcion}</p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="mt-auto p-4 bg-slate-50/30 border-t border-slate-100 space-y-3">
                    {/* Date badge */}
                    {(reporte.usarFechas || reporte.usarFechaCorte) && (
                      <div className="flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-sm w-fit">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                            {reporte.usarFechaCorte
                              ? `Al ${new Date(fechaHasta).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`
                              : `${new Date(fechaDesde).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} a ${new Date(fechaHasta).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Download Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {reporte.descargas.map((descarga) => {
                        const key = `${reporte.id}-${descarga.tipo}`
                        const isDownloading = downloadingKey === key
                        return (
                          <Button
                            key={key}
                            size="sm"
                            variant="secondary"
                            className={`flex items-center gap-2 h-8 px-3 rounded-lg border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${formatoEstilo(descarga.tipo)}`}
                            onClick={() => handleDescargar(reporte, descarga)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              formatoBadgeIcon(descarga.tipo)
                            )}
                            <span className="text-[11px] font-bold uppercase">{descarga.tipo}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
