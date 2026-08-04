"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Scale, BookText, ListTree, ArrowRight, TrendingUp, TrendingDown, Wallet, Landmark, Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"
import { AiResultPanel } from "@/components/ai-result-panel"

const DEFAULT_PROMPT_DETECCION_FRAUDE =
  "Revisa los comprobantes recientes y señala patrones sospechosos (montos redondos repetidos, mismo usuario y cuenta en horarios inusuales, reversos seguidos de reingresos, etc.) que ameriten revisión manual. No acuses, solo señala qué revisar y por qué."
const DEFAULT_PROMPT_BUSQUEDA_NATURAL =
  "Responde la pregunta del usuario usando únicamente los datos contables que te compartí como contexto. Si no hay suficiente información, dilo explícitamente en vez de inventar cifras."
const DEFAULT_PROMPT_FLUJO_CAJA =
  "Con base en el histórico de ingresos y egresos, proyecta el flujo de caja de los próximos meses."
const DEFAULT_PROMPT_LIQUIDEZ =
  "Con base en el flujo de caja histórico, cartera por cobrar y cuentas por pagar, estima la liquidez esperada en las próximas semanas."
const DEFAULT_PROMPT_DEFICIT =
  "Revisa los compromisos de pago próximos contra el saldo e ingresos esperados, y alerta si hay riesgo de déficit de caja, indicando cuándo y de cuánto."
const DEFAULT_PROMPT_PROYECCION_IMPUESTOS =
  "Con base en las ventas, compras e IVA del período, estima aproximadamente cuánto habrá que pagar de impuestos en el próximo vencimiento."

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
  const [recentEntries, setRecentEntries] = useState<any[]>([])

  const aiFraude = useAiEvent("cont_deteccion_fraude", DEFAULT_PROMPT_DETECCION_FRAUDE)
  const aiBusqueda = useAiEvent("cont_busqueda_natural", DEFAULT_PROMPT_BUSQUEDA_NATURAL)
  const aiFlujoCaja = useAiEvent("cont_proyeccion_flujo_caja", DEFAULT_PROMPT_FLUJO_CAJA)
  const aiLiquidez = useAiEvent("tesoreria_prediccion_liquidez", DEFAULT_PROMPT_LIQUIDEZ)
  const aiDeficit = useAiEvent("tesoreria_alertas_deficit", DEFAULT_PROMPT_DEFICIT)
  const aiImpuestos = useAiEvent("tesoreria_proyeccion_impuestos", DEFAULT_PROMPT_PROYECCION_IMPUESTOS)
  const [treasuryResult, setTreasuryResult] = useState<string | null>(null)
  const [aiPanelResult, setAiPanelResult] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }

        const [accountsRes, entriesRes, trialRes, incomeRes, balanceRes, recentRes] = await Promise.all([
          fetch(`${apiBase}accounting/accounts`, { headers }),
          fetch(`${apiBase}accounting/entries?limit=1`, { headers }),
          fetch(`${apiBase}accounting/reports/trial-balance`, { headers }),
          fetch(`${apiBase}accounting/reports/income-statement`, { headers }),
          fetch(`${apiBase}accounting/reports/balance-sheet`, { headers }),
          fetch(`${apiBase}accounting/entries?limit=20`, { headers }),
        ])

        const accounts = await accountsRes.json()
        const entries = await entriesRes.json()
        const trial = await trialRes.json()
        const incomeData = await incomeRes.json()
        const balanceData = await balanceRes.json()
        const recent = await recentRes.json()

        setAccountsCount(accounts?.data?.length ?? 0)
        setEntriesCount(entries?.meta?.total ?? 0)
        setTrialRows(trial?.data ?? [])
        setIncome(incomeData?.data ?? null)
        setBalance(balanceData?.data ?? null)
        setRecentEntries(recent?.data ?? [])
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

  const buildFinancialContext = () => [
    `Cuentas en el plan de cuentas: ${accountsCount}`,
    `Comprobantes registrados: ${entriesCount}`,
    income ? `Ingresos: ${money(income.totalIncome)}, Costo de ventas: ${money(income.totalCost)}, Gastos: ${money(income.totalExpense)}, Utilidad neta: ${money(income.netIncome)}` : "",
    balance ? `Activo total: ${money(balance.totalAssets)}, Pasivo total: ${money(balance.totalLiabilities)}, Patrimonio: ${money(balance.totalEquity)}` : "",
    `Comprobantes recientes: ${recentEntries.map((e: any) => `#${e.number} ${e.description || ""} (${new Date(e.date).toLocaleDateString("es-CO")})`).join("; ")}`,
  ].filter(Boolean).join("\n")

  const askQuestion = async () => {
    if (!question.trim() || asking) return
    setAsking(true)
    try {
      const token = getToken()
      const res = await fetch(`${apiBase}ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `${aiBusqueda.prompt}\n\nDatos contables:\n${buildFinancialContext()}\n\nPregunta: ${question}` }],
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.message || "Error al consultar la IA")
      setAiPanelResult(result.data.reply || "")
    } catch (e) {
      setAiPanelResult(e instanceof Error ? `No se pudo consultar la IA: ${e.message}` : "No se pudo consultar la IA")
    } finally {
      setAsking(false)
    }
  }

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

      {!loading && (aiBusqueda.enabled || aiFraude.enabled) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(209,79%,35%)]" />
            <p className="text-sm font-bold text-gray-900">Asistente de IA Contable</p>
          </div>

          {aiBusqueda.enabled && (
            <div className="flex items-center gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") askQuestion() }}
                placeholder="Pregúntale algo a tus datos contables (ej: ¿cómo va la utilidad este mes?)"
                className="h-11 flex-1"
              />
              <Button onClick={askQuestion} disabled={asking || !question.trim()} className="h-11 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] gap-1.5 shrink-0">
                <Send className="h-4 w-4" /> {asking ? "..." : "Preguntar"}
              </Button>
            </div>
          )}

          {aiFraude.enabled && (
            <AiSuggestButton
              prompt={aiFraude.prompt}
              context={buildFinancialContext()}
              onResult={setAiPanelResult}
              label="Detectar riesgos en comprobantes recientes"
              className="gap-1.5"
            />
          )}

          {aiPanelResult && <AiResultPanel text={aiPanelResult} onClose={() => setAiPanelResult(null)} color="blue" />}
        </div>
      )}

      {!loading && (aiFlujoCaja.enabled || aiLiquidez.enabled || aiDeficit.enabled || aiImpuestos.enabled) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[hsl(209,79%,35%)]" />
            <p className="text-sm font-bold text-gray-900">Tesorería con IA</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiFlujoCaja.enabled && (
              <AiSuggestButton prompt={aiFlujoCaja.prompt} context={buildFinancialContext()} onResult={setTreasuryResult} label="Proyectar flujo de caja" />
            )}
            {aiLiquidez.enabled && (
              <AiSuggestButton prompt={aiLiquidez.prompt} context={buildFinancialContext()} onResult={setTreasuryResult} label="Predecir liquidez" />
            )}
            {aiDeficit.enabled && (
              <AiSuggestButton prompt={aiDeficit.prompt} context={buildFinancialContext()} onResult={setTreasuryResult} label="Alertas de déficit" />
            )}
            {aiImpuestos.enabled && (
              <AiSuggestButton prompt={aiImpuestos.prompt} context={buildFinancialContext()} onResult={setTreasuryResult} label="Proyectar impuestos" />
            )}
          </div>
          {treasuryResult && <AiResultPanel text={treasuryResult} onClose={() => setTreasuryResult(null)} color="purple" />}
        </div>
      )}

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
