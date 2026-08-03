"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronDown } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
const PAGE_SIZE = 20

type JournalEntry = {
  id: number
  number: number
  type: string
  date: string
  description: string | null
  lines: {
    id: number
    debit: string
    credit: string
    description?: string | null
    account: { code: string; name: string }
  }[]
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

export default function LibrosPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = async (targetPage: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const token = getToken()
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(targetPage) })
      if (search.trim()) params.set("search", search.trim())
      const res = await fetch(`${apiBase}accounting/reports/journal?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      setLastPage(data?.meta?.lastPage ?? 1)
      setPage(targetPage)
      setEntries((prev) => (append ? [...prev, ...(data?.data ?? [])] : data?.data ?? []))
    } catch (err) {
      console.error(err)
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(1, false), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Libro Diario</h1>
        <p className="text-sm text-gray-500">Comprobantes registrados, en orden cronológico</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9 h-11 rounded-xl"
          placeholder="Buscar por descripción, número o cuenta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando libro diario...</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {search ? `Sin resultados para "${search}"` : "Aún no hay comprobantes registrados"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="max-h-[650px] overflow-y-auto divide-y divide-gray-100">
            {entries.map((entry) => {
              const expanded = expandedId === entry.id
              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-gray-50/60 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      <span className="text-sm font-mono font-bold text-gray-700 whitespace-nowrap">{entry.type}-{entry.number}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(entry.date).toLocaleDateString("es-CO")}</span>
                      <span className="text-xs text-gray-500 truncate hidden sm:inline">{entry.description || ""}</span>
                    </div>
                  </button>
                  {expanded && (
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase tracking-wider">
                          <th className="text-left px-5 py-2 font-semibold">Cuenta</th>
                          <th className="text-right px-5 py-2 font-semibold">Débito</th>
                          <th className="text-right px-5 py-2 font-semibold">Crédito</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {entry.lines.map((line) => (
                          <tr key={line.id} className="text-sm">
                            <td className="px-5 py-2 text-gray-700">{line.account.code} - {line.account.name}</td>
                            <td className="px-5 py-2 text-right text-gray-900">{Number(line.debit) > 0 ? money(line.debit) : "—"}</td>
                            <td className="px-5 py-2 text-right text-gray-900">{Number(line.credit) > 0 ? money(line.credit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
          {page < lastPage && (
            <div className="border-t border-gray-100 p-3 text-center">
              <Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => load(page + 1, true)}>
                {loadingMore ? "Cargando..." : "Cargar más"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
