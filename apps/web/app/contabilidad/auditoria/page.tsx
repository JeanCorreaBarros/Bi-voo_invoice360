"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type AuditEntry = {
  id: string
  action: string
  module: string
  entityId: string | null
  createdAt: string
  ip: string | null
  user: { id: string; name: string; email: string } | null
  before?: unknown
  after?: unknown
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  VOID: "bg-red-100 text-red-700",
  DELETE: "bg-red-100 text-red-700",
}

export default function AuditoriaPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const limit = 25

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}accounting/audit-logs?page=${page}&limit=${limit}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      setEntries(data?.items ?? [])
      setTotal(data?.total ?? 0)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar el registro de auditoría")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500">Historial de acciones contables realizadas en el sistema</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay eventos de auditoría registrados</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Fecha", "Usuario", "Módulo", "Acción", "Entidad", "IP", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(e)}
                >
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("es-CO")}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{e.user?.name || "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">{e.module}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[e.action] || "bg-gray-100 text-gray-500"}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{e.entityId || "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">{e.ip || "—"}</td>
                  <td className="px-5 py-3">
                    <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:text-[hsl(209,79%,35%)]">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <span className="text-xs text-gray-500">Página {page} de {totalPages} — {total} eventos</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg text-gray-500">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg text-gray-500">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.module} · {selected?.action} {selected?.entityId ? `(${selected.entityId})` : ""}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Usuario</p>
                  <p className="text-gray-800">{selected.user?.name || "—"} {selected.user?.email ? `(${selected.user.email})` : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Fecha</p>
                  <p className="text-gray-800">{new Date(selected.createdAt).toLocaleString("es-CO")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">IP</p>
                  <p className="text-gray-800">{selected.ip || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Antes</p>
                  <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                    {selected.before ? JSON.stringify(selected.before, null, 2) : "Sin datos previos"}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Después</p>
                  <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                    {selected.after ? JSON.stringify(selected.after, null, 2) : "Sin datos"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
