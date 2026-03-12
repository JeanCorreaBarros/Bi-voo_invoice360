"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, PieChart, BarChart3, TrendingUp, RefreshCw, FileSpreadsheet, Calendar, Search, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
// Skeleton loader component for report cards
function ReportCardSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton loader component for statistics
function EstadisticasSkeleton() {
  return (
    <>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-20 mx-auto animate-pulse"></div>
      </div>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-20 mx-auto animate-pulse"></div>
      </div>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-20 mx-auto animate-pulse"></div>
      </div>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-20 mx-auto animate-pulse"></div>
      </div>
    </>
  )
}

interface DescargarOpciones {
  id?: number
  tipo: "PDF" | "Excel" | "ZIP"
  label: string
  labelShort?: string
  endpoint?: string
}

interface Reporte {
  id: number
  nombre: string
  descripcion: string
  icon: any
  descargas: DescargarOpciones[]
  usarFechas?: boolean
}

const reportes: Reporte[] = [] // Se llenará desde la API

interface Estadisticas {
  totalRegistros: number
  verificados: number
  pendientes: number
  rechazados: number
}

const defaultEstadisticas: Estadisticas = {
  totalRegistros: 0,
  verificados: 0,
  pendientes: 0,
  rechazados: 0,
}

// Mapa de iconos para Lucide
const IconMap: { [key: string]: any } = {
  PieChart: PieChart,
  BarChart3: BarChart3,
  FileText: FileText,
  TrendingUp: TrendingUp,
}

export default function ReportesPage() {
  const [reportesList, setReportesList] = useState<Reporte[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas>(defaultEstadisticas)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [globalTexto, setGlobalTexto] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Estados para las fechas
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return primerDiaMes.toISOString().split('T')[0]
  })

  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    const hoy = new Date()
    return hoy.toISOString().split('T')[0]
  })

  const fetchReportes = async (isRefreshing = false) => {
    try {
      setLoading(true)
      setError(null)
      if (isRefreshing) setReportesList([]) // Trigger skeleton

      const token = sessionStorage.getItem("token")
      if (!token) {
        setError("No autorizado. Por favor inicia sesión nuevamente.")
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api"
      const response = await fetch(`${apiBaseUrl}/reports`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error al cargar reportes: ${response.status} ${response.statusText}`)
      }

      const json = await response.json()
      if (json.ok && Array.isArray(json.data)) {
        const mappedData = json.data.map((item: any) => ({
          ...item,
          icon: IconMap[item.icon] || FileText,
          usarFechas: item.nombre.toLowerCase().includes("registro") || item.nombre.toLowerCase().includes("ventas") || item.nombre.toLowerCase().includes("resumen")
        }))
        setReportesList(mappedData)
        if (isRefreshing) toast.success("Reportes actualizados")
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar reportes'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportes()
  }, [])

  const handleDescargar = async (reporteId: number, tipo: string, endpoint?: string, usarFechas?: boolean) => {
    // ... existing handleDescargar code ...
    try {
      setLoading(true)
      setError(null)

      const token = sessionStorage.getItem("token")

      if (!token) {
        setError("No autorizado. Por favor inicia sesión nuevamente.")
        return
      }

      if (!endpoint) {
        setError("Endpoint no configurado para este reporte.")
        return
      }

      // Validar fechas si el reporte las usa
      if (usarFechas) {
        if (!fechaDesde || !fechaHasta) {
          setError("Por favor selecciona ambas fechas")
          return
        }

        if (new Date(fechaDesde) > new Date(fechaHasta)) {
          setError("La fecha inicial no puede ser mayor a la fecha final")
          return
        }
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api"

      // Construir la URL con los parámetros
      let fullUrl = `${apiBaseUrl}${endpoint}`
      const params = new URLSearchParams()

      if (usarFechas) {
        params.append("from", fechaDesde)
        params.append("to", fechaHasta)
      }

      if (globalTexto && globalTexto.trim()) {
        params.append("texto", globalTexto.trim())
      }

      const queryString = params.toString()
      if (queryString) {
        const separator = fullUrl.includes('?') ? '&' : '?'
        fullUrl += `${separator}${queryString}`
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      let fileExtension = 'bin'
      const tipoLower = tipo.toLowerCase()
      if (tipoLower.includes("pdf")) fileExtension = 'pdf'
      else if (tipoLower.includes("excel")) fileExtension = 'xlsx'
      else if (tipoLower.includes("zip")) fileExtension = 'zip'

      const fileName = `reporte_${reporteId}_${new Date().toLocaleDateString("es-ES").replace(/\//g, "-")}.${fileExtension}`

      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${tipo} descargado correctamente`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Error al descargar ${tipo}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error al descargar:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-6">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Reportes</h1>
            <p className="text-slate-500 mt-1">Gestión y descarga de documentos analíticos</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReportes(true)}
            disabled={loading}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all gap-2 h-10 px-4"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
            <span className="font-medium">{loading ? "Actualizando..." : "Actualizar datos"}</span>
          </Button>
        </div>

        {/* Filtro de Fechas - Acordeón elegante */}
        <div className="mb-6 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showFilters ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <SlidersHorizontal className={`h-4 w-4 transition-colors ${showFilters ? 'text-blue-600' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-slate-700 block">Rango de consulta</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                  {showFilters ? 'Haz clic para ocultar filtros' : 'Haz clic para expandir filtros y búsqueda'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Resumen rápido de filtros activos cuando está cerrado */}
              {!showFilters && (
                <div className="hidden md:flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                     <Calendar className="w-2.5 h-2.5" />
                     {new Date(fechaDesde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {new Date(fechaHasta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                   </div>
                   {globalTexto && (
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded text-[10px] font-bold text-blue-600">
                       <Search className="w-2.5 h-2.5" />
                       {globalTexto.length > 15 ? `${globalTexto.substring(0, 15)}...` : globalTexto}
                     </div>
                   )}
                </div>
              )}
              {showFilters ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />}
            </div>
          </button>
          
          <motion.div
            initial={false}
            animate={{ 
              height: showFilters ? "auto" : 0,
              opacity: showFilters ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="desde" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">Fecha Inicio</Label>
                  <Input
                    id="desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hasta" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">Fecha Fin</Label>
                  <Input
                    id="hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="texto-global" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-1">Texto de búsqueda / Filtro General</Label>
                  <div className="relative">
                    <Input
                      id="texto-global"
                      type="text"
                      placeholder="Escribe aquí "
                      value={globalTexto}
                      onChange={(e) => setGlobalTexto(e.target.value)}
                      className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors h-10 pr-10"
                    />
                    {globalTexto && (
                      <button
                        onClick={() => setGlobalTexto("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loading && reportesList.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <ReportCardSkeleton key={i} />)
          ) : (
            reportesList.map((reporte, index) => (
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
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                          {reporte.descripcion}
                        </p>
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="mt-auto p-4 bg-slate-50/30 border-t border-slate-100 space-y-3">
                      {/* Period and Search Badges */}
                      <div className="flex flex-wrap gap-2">
                        {reporte.usarFechas && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-sm w-fit">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                              {new Date(fechaDesde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} a {new Date(fechaHasta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        )}

                        {globalTexto && globalTexto.trim() && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-md border border-blue-100 shadow-sm w-fit animate-in fade-in zoom-in duration-300">
                            <Search className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tighter max-w-[120px] truncate">
                              "{globalTexto.trim()}"
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Compact Download Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {reporte.descargas.map((descarga, idx) => (
                          <Button
                            key={descarga.id || idx}
                            size="sm"
                            variant="secondary"
                            className={`flex items-center gap-2 h-8 px-3 rounded-lg border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${descarga.tipo === "PDF"
                              ? "bg-white border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                              : descarga.tipo === "Excel"
                                ? "bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                : "bg-white border-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-200"
                              }`}
                            onClick={() => handleDescargar(reporte.id, descarga.tipo, descarga.endpoint, reporte.usarFechas)}
                            disabled={loading}
                          >
                            {descarga.tipo === "PDF" ? (
                              <Download className="w-3 h-3" />
                            ) : descarga.tipo === "Excel" ? (
                              <FileSpreadsheet className="w-3 h-3" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span className="text-[11px] font-bold uppercase">{descarga.tipo}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Empty state */}
        {!loading && reportesList.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sin reportes</h3>
            <p className="text-slate-500 mt-1">No se encontraron documentos disponibles en el servidor.</p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => fetchReportes(true)}
            >
              Intentar de nuevo
            </Button>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  )
}
