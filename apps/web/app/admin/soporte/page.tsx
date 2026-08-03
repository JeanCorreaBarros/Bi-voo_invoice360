"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DashboardHeader } from "@/components/dashboard-header"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import {
  ShieldAlert,
  TicketIcon,
  Clock,
  CheckCircle2,
  CircleDot,
  XCircle,
  Building2,
} from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Ticket = {
  id: string
  companyId: string
  companyName: string
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

const STATUS_OPTIONS: Ticket["status"][] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

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

export default function AdminSoportePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all")
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const getToken = () => {
    try {
      return sessionStorage.getItem("token")
    } catch {
      return null
    }
  }

  useEffect(() => {
    try {
      const permissions: string[] = JSON.parse(localStorage.getItem("permissions") || "[]")
      setAuthorized(permissions.includes("company.manage"))
    } catch {
      setAuthorized(false)
    }
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-tickets`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al cargar tickets")
      setTickets(result.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) fetchTickets()
  }, [authorized])

  const openTicket = (t: Ticket) => {
    setSelected(t)
    setReplyDraft(t.adminReply || "")
  }

  const saveTicket = async (status?: Ticket["status"]) => {
    if (!selected) return
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}support-tickets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: status || selected.status, adminReply: replyDraft }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "No se pudo actualizar el ticket")
      toast.success("Ticket actualizado")
      setSelected(null)
      fetchTickets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el ticket")
    } finally {
      setSaving(false)
    }
  }

  const filtered = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter)
  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: tickets.filter((t) => t.status === s).length }), {} as Record<string, number>)

  if (authorized === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Verificando acceso...</div>
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-300" />
        <h1 className="text-lg font-bold text-gray-800">Acceso restringido</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Esta sección es exclusiva para administradores de plataforma (SUPER_ADMIN).
        </p>
        <div className="flex gap-3">
          <Button onClick={() => router.push("/")} className="bg-blue-950 hover:bg-blue-800 text-white rounded-xl">
            Volver al inicio
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              logout()
              router.replace("/")
            }}
            className="rounded-xl text-gray-500 hover:bg-gray-100"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />

      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Soporte — Todas las Empresas</h1>
            <p className="text-sm text-gray-500">Tickets creados por cualquier empresa de la plataforma</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === "all" ? "bg-[hsl(209,79%,35%)] text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Todos ({tickets.length})
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  statusFilter === s ? "bg-[hsl(209,79%,35%)] text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {STATUS_META[s].label} ({counts[s] || 0})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando tickets...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <TicketIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay tickets en este estado</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Empresa", "Asunto", "Tipo", "Prioridad", "Estado", "Fecha", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((t) => (
                    <tr key={t.id} onClick={() => openTicket(t)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" /> {t.companyName}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 max-w-[240px] truncate">{t.subject}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{t.type}</td>
                      <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-blue-600 whitespace-nowrap">Atender</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg bg-white">
          {selected && (
            <>
              <DialogTitle>{selected.subject}</DialogTitle>
              <DialogDescription>
                {selected.companyName} — {selected.createdByName} ({selected.createdByEmail})
              </DialogDescription>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Estado actual</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Prioridad</span>
                  <PriorityBadge priority={selected.priority} />
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Descripción</span>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selected.description}</p>
                </div>

                <div>
                  <span className="text-gray-500 block mb-1.5">Respuesta / notas internas</span>
                  <Textarea
                    rows={4}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Escribe una respuesta para el cliente..."
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-500 block">Cambiar estado</span>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => saveTicket(s)}
                        disabled={saving}
                        className={`h-10 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                          selected.status === s ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => saveTicket()}
                  disabled={saving}
                  className="w-full h-11 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] rounded-xl"
                >
                  {saving ? "Guardando..." : "Guardar respuesta"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
