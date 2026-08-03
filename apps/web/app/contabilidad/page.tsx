"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Scale, BookText, ListTree, ArrowRight, TrendingUp, TrendingDown, Wallet, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
}

type TrialRow = { accountId: string; code: string; name: string; debit: number; credit: number; balance: number }
type IncomeStatement = { totalIncome: number; totalCost: number; grossProfit: number; totalExpense: number; netIncome: number }
type BalanceSheet = { totalAssets: number; totalLiabilities: number; totalEquity: number }

export default function ContabilidadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accountsCount, setAccountsCount] = useState(0)
  const [entriesCount, setEntriesCount] = useState(0)
  const [trialRows, setTrialRows] = useState<TrialRow[]>([])
  const [income, setIncome] = useState<IncomeStatement | null>(null)
  const [balance, setBalance] = useState<BalanceSheet | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }

        const [accountsRes, entriesRes, trialRes, incomeRes, balanceRes] = await Promise.all([
          fetch(`${apiBase}accounting/accounts`, { headers }),
          fetch(`${apiBase}accounting/entries?limit=1`, { headers }),
          fetch(`${apiBase}accounting/reports/trial-balance`, { headers }),
          fetch(`${apiBase}accounting/reports/income-statement`, { headers }),
          fetch(`${apiBase}accounting/reports/balance-sheet`, { headers }),
        ])

        const accounts = await accountsRes.json()
        const entries = await entriesRes.json()
        const trial = await trialRes.json()
        const incomeData = await incomeRes.json()
        const balanceData = await balanceRes.json()

        setAccountsCount(accounts?.data?.length ?? 0)
        setEntriesCount(entries?.meta?.total ?? 0)
        setTrialRows(trial?.data ?? [])
        setIncome(incomeData?.data ?? null)
        setBalance(balanceData?.data ?? null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalDebit = trialRows.reduce((sum, r) => sum + Number(r.debit), 0)
  const totalCredit = trialRows.reduce((sum, r) => sum + Number(r.credit), 0)
  const topAccounts = [...trialRows]
    .filter((r) => Number(r.debit) > 0 || Number(r.credit) > 0)
    .sort((a, b) => Number(b.debit) + Number(b.credit) - (Number(a.debit) + Number(a.credit)))
    .slice(0, 5)

  const cards = [
    { label: "Cuentas en el Plan de Cuentas", value: String(accountsCount), icon: ListTree, href: "/contabilidad/plan-cuentas" },
    { label: "Comprobantes registrados", value: String(entriesCount), icon: BookText, href: "/contabilidad/comprobantes" },
    { label: "Total débitos", value: money(totalDebit), icon: Scale, href: "/contabilidad/reportes" },
    { label: "Total créditos", value: money(totalCredit), icon: Scale, href: "/contabilidad/reportes" },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contabilidad</h1>
        <p className="text-sm text-gray-500">Plan de cuentas, comprobantes y reportes financieros de tu empresa</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => router.push(card.href)}
            className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-[hsl(209,79%,35%,0.1)] flex items-center justify-center mb-2.5">
              <card.icon className="h-4 w-4 text-[hsl(209,79%,35%)]" />
            </div>
            <p className="text-lg font-black text-gray-900 truncate">{loading ? "…" : card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </button>
        ))}
      </div>

      {!loading && income && (income.totalIncome > 0 || income.totalExpense > 0 || income.totalCost > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Resumen Financiero (histórico)</p>
            <button
              onClick={() => router.push("/contabilidad/estado-resultados")}
              className="text-xs text-[hsl(209,79%,35%)] font-semibold hover:underline flex items-center gap-1"
            >
              Ver Estado de Resultados <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Ingresos</span>
              </div>
              <p className="text-xl font-black text-gray-900">{money(income.totalIncome)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Costo de Ventas</span>
              </div>
              <p className="text-xl font-black text-gray-900">{money(income.totalCost)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Gastos</span>
              </div>
              <p className="text-xl font-black text-gray-900">{money(income.totalExpense)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className={`h-3.5 w-3.5 ${income.netIncome >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Utilidad Neta</span>
              </div>
              <p className={`text-xl font-black ${income.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {money(income.netIncome)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!loading && balance && (balance.totalAssets > 0 || balance.totalLiabilities > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">Balance General</p>
              <button
                onClick={() => router.push("/contabilidad/balance-general")}
                className="text-xs text-[hsl(209,79%,35%)] font-semibold hover:underline flex items-center gap-1"
              >
                Ver detalle <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Activo total</span>
                <span className="text-sm font-bold text-gray-900">{money(balance.totalAssets)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Pasivo total</span>
                <span className="text-sm font-bold text-gray-900">{money(balance.totalLiabilities)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-600">Patrimonio</span>
                <span className="text-sm font-black text-[hsl(209,79%,35%)]">{money(balance.totalEquity)}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && topAccounts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">Cuentas con más movimiento</p>
              <button
                onClick={() => router.push("/contabilidad/reportes")}
                className="text-xs text-[hsl(209,79%,35%)] font-semibold hover:underline flex items-center gap-1"
              >
                Balance de Prueba <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {topAccounts.map((row) => (
                <div key={row.accountId} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 truncate">
                    <span className="font-mono text-gray-400 mr-1.5">{row.code}</span>
                    {row.name}
                  </span>
                  <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{money(Number(row.debit) + Number(row.credit))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!loading && entriesCount === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-gray-900">¿Primera vez aquí?</p>
            <p className="text-sm text-gray-500">
              Tu empresa ya tiene un Plan de Cuentas colombiano estándar precargado. Registra tu primer comprobante manual para empezar.
            </p>
          </div>
          <Button
            onClick={() => router.push("/contabilidad/comprobantes")}
            className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white rounded-xl"
          >
            Crear comprobante <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
