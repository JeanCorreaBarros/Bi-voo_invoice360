"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LifeBuoy,
  SearchIcon,
  Ticket as TicketIcon,
  Plus,
  Clock,
  CheckCircle2,
  CircleDot,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Ticket = {
  id: string
  subject: string
  description: string
  type: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdByName: string
  createdByEmail: string
  adminReply: string | null
  createdAt: string
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const STATUS_META: Record<Ticket["status"], { label: string; className: string; icon: any }> = {
  OPEN: { label: "Abierto", className: "bg-blue-100 text-blue-700", icon: CircleDot },
  IN_PROGRESS: { label: "En proceso", className: "bg-amber-100 text-amber-700", icon: Clock },
  RESOLVED: { label: "Resuelto", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CLOSED: { label: "Cerrado", className: "bg-gray-100 text-gray-500", icon: XCircle },
}

const PRIORITY_META: Record<Ticket["priority"], { label: string; className: string }> = {
  LOW: { label: "Baja", className: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Media", className: "bg-blue-100 text-blue-700" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  CRITICAL: { label: "Crítica", className: "bg-red-100 text-red-700" },
}

const FAQS = [
  {
    q: "¿Cómo puedo restablecer mi contraseña?",
    a: "Haz clic en \"¿Olvidaste tu contraseña?\" en la pantalla de inicio de sesión. Recibirás un correo con instrucciones para crear una nueva contraseña.",
  },
  {
    q: "¿Cómo puedo agregar un nuevo usuario al sistema?",
    a: "Ve a Configuración > Usuarios > Nuevo Usuario. Completa la información requerida y asigna los permisos correspondientes.",
  },
  {
    q: "¿Cómo puedo exportar mis reportes a Excel?",
    a: "En cualquier reporte, busca los botones de descarga (PDF/Excel/ZIP). Selecciona el formato y el archivo se descargará automáticamente.",
  },
  {
    q: "¿Cómo funciona el inventario y el kardex?",
    a: "En el módulo de Inventario puedes ver existencias, ajustarlas manualmente y revisar el historial de movimientos (kardex) de cada producto.",
  },
]

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  const meta = PRIORITY_META[priority]
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.className}`}>{meta.label}</span>
}

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [faqSearch, setFaqSearch] = useState("")

  const [form, setForm] = useState({ subject: "", type: "", priority: "MEDIUM", description: "" })
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = async () => {
    setLoadingTickets(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-tickets`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al cargar tickets")
      setTickets(result.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar tickets")
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const submitTicket = async () => {
    if (!form.subject.trim() || !form.type || !form.description.trim()) {
      toast.error("Completa asunto, tipo y descripción")
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo crear el ticket")
      toast.success("Ticket creado. Nuestro equipo lo revisará pronto.")
      setForm({ subject: "", type: "", priority: "MEDIUM", description: "" })
      fetchTickets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredFaqs = FAQS.filter(
    (f) =>
      !faqSearch.trim() ||
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />

      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(209,79%,22%)] via-[hsl(209,79%,30%)] to-[hsl(217,85%,45%)] px-6 py-10 md:px-10 md:py-14 shadow-xl">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white/90 mb-4">
                <Sparkles className="h-3.5 w-3.5" /> Centro de Ayuda
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">¿Cómo podemos ayudarte hoy?</h1>
              <p className="text-white/70 text-sm mb-6">Soporte de Invoice360, impulsado por Bi-voo.</p>
              <div className="relative max-w-md">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en preguntas frecuentes..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="h-12 pl-11 rounded-2xl border-0 shadow-lg bg-white text-gray-900"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="tickets" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <TabsList className="w-full border-b border-gray-100 rounded-none p-0 bg-gray-50/60 h-auto">
              <TabsTrigger value="tickets" className="flex-1 rounded-none py-3.5 gap-2 data-[state=active]:bg-white">
                <TicketIcon className="h-4 w-4" /> Mis Tickets
              </TabsTrigger>
              <TabsTrigger value="nuevo" className="flex-1 rounded-none py-3.5 gap-2 data-[state=active]:bg-white">
                <Plus className="h-4 w-4" /> Nuevo Ticket
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex-1 rounded-none py-3.5 gap-2 data-[state=active]:bg-white">
                <LifeBuoy className="h-4 w-4" /> Preguntas Frecuentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="p-6">
              {loadingTickets ? (
                <div className="py-16 text-center text-gray-400 text-sm">Cargando tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center">
                  <TicketIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aún no has creado ningún ticket de soporte</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="w-full text-left bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{t.subject}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(t.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })} · {t.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                      {t.adminReply && (
                        <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 line-clamp-1">
                          Respuesta del equipo: {t.adminReply}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="nuevo" className="p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Crear Nuevo Ticket de Soporte</h3>
                <p className="text-sm text-gray-500 -mt-2">
                  Tu ticket llega directamente al equipo de soporte de Bi-voo.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Asunto</label>
                  <Input
                    placeholder="Describe brevemente tu problema"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tipo de Problema</label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Problema Técnico">Problema Técnico</SelectItem>
                        <SelectItem value="Problema de Facturación">Problema de Facturación</SelectItem>
                        <SelectItem value="Problema con mi Cuenta">Problema con mi Cuenta</SelectItem>
                        <SelectItem value="Sugerencia">Sugerencia</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Prioridad</label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baja</SelectItem>
                        <SelectItem value="MEDIUM">Media</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <Textarea
                    placeholder="Describe detalladamente el problema que estás experimentando"
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={submitTicket}
                    disabled={submitting}
                    className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl px-6"
                  >
                    {submitting ? "Enviando..." : "Enviar Ticket"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="faq" className="p-6">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Preguntas Frecuentes</h3>
                <div className="space-y-3">
                  {filteredFaqs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin resultados para "{faqSearch}"</p>
                  ) : (
                    filteredFaqs.map((f) => (
                      <div key={f.q} className="border border-gray-100 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-800 mb-1.5 text-sm">{f.q}</h4>
                        <p className="text-sm text-gray-500">{f.a}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">¿No encuentras respuesta a tu pregunta? Crea un ticket en la pestaña anterior.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileBottomNav />

      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null) }}>
        <DialogContent className="max-w-lg bg-white">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>Ticket #{selectedTicket.id.slice(-8).toUpperCase()}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Estado</span>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Prioridad</span>
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-medium text-gray-800">{selectedTicket.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Fecha</span>
                  <span className="text-gray-800">{new Date(selectedTicket.createdAt).toLocaleString("es-CO")}</span>
                </div>

                <div>
                  <span className="text-gray-500 block mb-1">Descripción</span>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedTicket.description}</p>
                </div>

                {selectedTicket.adminReply ? (
                  <div>
                    <span className="text-gray-500 block mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Respuesta del equipo de soporte
                    </span>
                    <p className="text-emerald-800 whitespace-pre-wrap bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      {selectedTicket.adminReply}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 bg-gray-50 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Aún sin respuesta del equipo de soporte</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
