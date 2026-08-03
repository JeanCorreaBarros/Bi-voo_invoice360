"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "react-hot-toast"
import { DashboardHeader } from "@/components/dashboard-header"
import {
    DollarSign,
    Calendar,
    Users,
    TrendingUp,
    Clock,
    ArrowUpRight,
    Search,
    ChevronRight,
    Filter,
    CheckCircle2,
    X,
    FileText,
    MapPin,
    Phone,
    Mail,
    Info,
    Hash,
    ShieldCheck
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

type TabType = "general" | "overdue" | "by-customer"

interface AccountReceivable {
    invoiceId: number
    customer: string
    total: string
    paid: number
    balance: number
}

interface OverdueInvoice {
    id: number
    orderPrefix: string
    orderId: number
    orderReceiverName: string
    orderTotalAfterTax: string
    dueDate: string
    status: string
}

interface CustomerBalance {
    customer: string
    balance: number
}

interface FullInvoiceDetail {
    id: number
    orderPrefix: string
    orderId: number
    orderReceiverName: string
    orderReceiverAddress: string
    orderReceiverNit: string
    orderReceiverPhone: string
    orderReceiverEmail: string
    orderTotalAfterTax: string
    orderTotalBeforeTax: string
    orderTotalTax: string
    orderSubtotalBeforeTax: string
    orderTotalAmountDue: string
    orderAmountPaid: string
    dueDate: string
    orderDate: string
    status: string
    dianStatus: string
    note: string
    orderResolution: string
    cufe: string
    orderTaxPer: string
    payments: any[]
}

export default function CarteraPage() {
    const [activeTab, setActiveTab] = useState<TabType>("general")
    const [receivables, setReceivables] = useState<AccountReceivable[]>([])
    const [overdue, setOverdue] = useState<OverdueInvoice[]>([])
    const [byCustomer, setByCustomer] = useState<CustomerBalance[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedInvoice, setSelectedInvoice] = useState<FullInvoiceDetail | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

    const fetchDetail = async (id: number) => {
        const token = sessionStorage.getItem("token")
        let apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
        
        if (apiBase.endsWith('/')) apiBase = apiBase.slice(0, -1);
        const url = `${apiBase}invoices/${id}`;
        
        console.log(`[DEBUG] fetchDetail called for ID: ${id}`);
        console.log(`[DEBUG] URL: ${url}`);
        
        try {
            const res = await fetch(url, {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })
            
            console.log(`[DEBUG] Status: ${res.status}`);
            const result = await res.json()
            console.log("[DEBUG] API Result:", result);

            let invoiceData = null;
            if (result.ok && result.data) {
                invoiceData = Array.isArray(result.data) ? result.data[0] : result.data;
            } else if (result.id || result.orderId) {
                invoiceData = result;
            } else if (result.invoice) {
                invoiceData = result.invoice;
            }

            if (invoiceData) {
                console.log("[DEBUG] Invoice data found, opening modal...");
                setSelectedInvoice(invoiceData)
                setIsDetailModalOpen(true)
            } else {
                console.error("[DEBUG] No invoice data found in result", result);
                toast.error("No se pudieron obtener los detalles de la factura");
            }
        } catch (error) {
            console.error("[DEBUG] Fetch Error:", error)
            toast.error("Error de comunicación con el servidor");
        }
    }

    const handleDownloadPDF = async (id: number, prefix: string, orderId: number) => {
        setIsDownloading(true)
        const token = sessionStorage.getItem("token")
        let apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"
        if (apiBase.endsWith('/')) apiBase = apiBase.slice(0, -1);

        try {
            const res = await fetch(`${apiBase}invoice-documents/${id}/pdf`, {
                headers: { "Authorization": `Bearer ${token}` }
            })

            if (!res.ok) throw new Error("Error al generar el PDF")

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `factura-${prefix}-${orderId}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success("PDF descargado correctamente")
        } catch (error) {
            console.error("Error downloading PDF:", error)
            toast.error("No se pudo descargar el PDF")
        } finally {
            setIsDownloading(false)
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        const token = sessionStorage.getItem("token")
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

        try {
            const [resGen, resOverdue, resByCust] = await Promise.all([
                fetch(`${apiBase}accounts-receivable`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${apiBase}accounts-receivable/overdue`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${apiBase}reports/accounts-receivable-by-customer`, { headers: { "Authorization": `Bearer ${token}` } })
            ])

            const [dataGen, dataOverdue, dataByCust] = await Promise.all([
                resGen.json(),
                resOverdue.json(),
                resByCust.json()
            ])

            if (dataGen.ok) setReceivables(dataGen.data)
            if (dataOverdue.ok) setOverdue(dataOverdue.data)
            if (dataByCust.ok) setByCustomer(dataByCust.data)

        } catch (error) {
            console.error("Error fetching cartera data:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const formatCurrency = (value: number | string) => {
        const num = typeof value === "string" ? parseFloat(value) : value
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0
        }).format(num)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <DashboardHeader />

            <main className="flex-1 p-4 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-8 pb-32">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-[hsl(209,79%,27%)] font-sans tracking-tight">Cartera</h1>
                        <p className="text-muted-foreground text-sm mt-1">Gestión y control de cuentas por cobrar.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[hsl(209,79%,55%)] transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-[hsl(209,79%,27%)] focus:outline-none focus:ring-2 focus:ring-[hsl(209,79%,45%,0.1)] focus:border-[hsl(209,79%,45%)] transition-all w-64 shadow-sm"
                            />
                        </div>
                        <button className="p-2.5 rounded-xl bg-white border border-border text-muted-foreground hover:text-[hsl(209,79%,45%)] hover:border-[hsl(209,79%,45%)] transition-colors shadow-sm">
                            <Filter className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards Mini */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-1 group hover:ring-1 hover:ring-[hsl(209,79%,45%,0.2)] transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Total</span>
                            <div className="p-2 rounded-lg bg-[hsl(142,70%,45%,0.1)] text-[hsl(142,70%,45%)]">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-[hsl(209,79%,27%)]">
                            {formatCurrency(receivables.reduce((acc, curr) => acc + curr.balance, 0))}
                        </span>
                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(142,70%,45%)] w-[70%]" />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-1 group hover:ring-1 hover:ring-[hsl(0,84%,60%,0.2)] transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Facturas Vencidas</span>
                            <div className="p-2 rounded-lg bg-[hsl(0,84%,60%,0.1)] text-[hsl(0,84%,60%)]">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-[hsl(209,79%,27%)]">{overdue.length}</span>
                        <p className="text-[11px] text-[hsl(0,84%,60%)] font-bold mt-2 font-sans tracking-tight">Requiere atención inmediata</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-1 group hover:ring-1 hover:ring-[hsl(45,100%,60%,0.2)] transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clientes con Deuda</span>
                            <div className="p-2 rounded-lg bg-[hsl(45,100%,60%,0.1)] text-[hsl(45,100%,60%)]">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-[hsl(209,79%,27%)]">{byCustomer.length}</span>
                        <p className="text-[11px] text-muted-foreground mt-2 font-sans">Clientes activos en cartera</p>
                    </div>
                </div>

                {/* Tabs Section */}
                <div className="bg-white rounded-3xl border border-border overflow-hidden flex flex-col shadow-sm">
                    <div className="flex items-center border-b border-border p-2 bg-gray-50/50">
                        <button
                            onClick={() => setActiveTab("general")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all ${activeTab === "general" ? "bg-[hsl(209,79%,35%)] text-white shadow-md shadow-[hsl(209,79%,35%,0.2)]" : "text-muted-foreground hover:text-[hsl(209,79%,27%)] hover:bg-white"}`}
                        >
                            <DollarSign className="h-4 w-4" />
                            Estado General
                        </button>
                        <button
                            onClick={() => setActiveTab("overdue")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all ${activeTab === "overdue" ? "bg-[hsl(209,79%,35%)] text-white shadow-md shadow-[hsl(209,79%,35%,0.2)]" : "text-muted-foreground hover:text-[hsl(209,79%,27%)] hover:bg-white"}`}
                        >
                            <Clock className="h-4 w-4" />
                            Facturas Vencidas
                        </button>
                        <button
                            onClick={() => setActiveTab("by-customer")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all ${activeTab === "by-customer" ? "bg-[hsl(209,79%,35%)] text-white shadow-md shadow-[hsl(209,79%,35%,0.2)]" : "text-muted-foreground hover:text-[hsl(209,79%,27%)] hover:bg-white"}`}
                        >
                            <Users className="h-4 w-4" />
                            Por Cliente
                        </button>
                    </div>

                    <div className="p-4 overflow-x-auto min-h-[400px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                                <div className="w-12 h-12 border-4 border-[hsl(209,79%,35%)] border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Cargando datos de cartera...</span>
                            </div>
                        ) : receivables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center gap-2">
                                <DollarSign className="h-12 w-12 text-gray-200" />
                                <p className="text-[hsl(209,79%,27%)] font-bold">No hay registros encontrados</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black">La cartera está al día</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === "general" && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-separate border-spacing-y-2">
                                                <thead>
                                                    <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                        <th className="px-6 py-4">Factura #</th>
                                                        <th className="px-6 py-4">Cliente</th>
                                                        <th className="px-6 py-4 text-right">Monto Total</th>
                                                        <th className="px-6 py-4 text-right">Pagado</th>
                                                        <th className="px-6 py-4 text-right">Saldo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {receivables
                                                        .filter(r => r.customer.toLowerCase().includes(searchTerm.toLowerCase()))
                                                        .map((r) => (
                                                            <tr key={r.invoiceId} className="bg-white hover:bg-gray-50 transition-colors rounded-2xl group border border-border shadow-sm">
                                                                <td className="px-6 py-5 rounded-l-2xl border-l border-t border-b border-border">
                                                                    <span className="text-sm font-black text-[hsl(209,79%,27%)]"># {r.invoiceId}</span>
                                                                </td>
                                                                <td className="px-6 py-5 border-t border-b border-border">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-900">{r.customer}</span>
                                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Crédito Activo</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 border-t border-b border-border text-right font-bold text-gray-900">
                                                                    {formatCurrency(r.total)}
                                                                </td>
                                                                <td className="px-6 py-5 border-t border-b border-border text-right font-bold text-emerald-600">
                                                                    {formatCurrency(r.paid)}
                                                                </td>
                                                                <td className="px-6 py-5 rounded-r-2xl border-r border-t border-b border-border text-right font-black text-[hsl(209,79%,35%)]">
                                                                    {formatCurrency(r.balance)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {activeTab === "overdue" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {overdue
                                                .filter(o => o.orderReceiverName.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map((o) => (
                                                    <div
                                                        key={o.id}
                                                        onClick={() => fetchDetail(o.id)}
                                                        className={`bg-white border border-border p-6 rounded-3xl hover:ring-1 transition-all group overflow-hidden relative shadow-sm cursor-pointer ${o.status === "PAID" ? "hover:ring-emerald-200" : "hover:ring-[hsl(209,79%,45%,0.2)]"}`}
                                                    >
                                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                                            {o.status === "PAID" ? (
                                                                <CheckCircle2 className="h-24 w-24 text-emerald-500" />
                                                            ) : (
                                                                <Clock className="h-24 w-24 text-[hsl(0,84%,60%)]" />
                                                            )}
                                                        </div>

                                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-black uppercase tracking-widest mb-1 ${o.status === "PAID" ? "text-emerald-500" : "text-[hsl(0,84%,60%)]"}`}>
                                                                    {o.status === "PAID" ? "PAGADA" : "VENCIDA"}
                                                                </span>
                                                                <h4 className="text-xl font-black text-[hsl(209,79%,27%)]">{o.orderPrefix}-{o.orderId}</h4>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Deuda</p>
                                                                <p className={`text-xl font-black ${o.status === "PAID" ? "text-emerald-600" : "text-[hsl(0,84%,60%)]"}`}>
                                                                    {formatCurrency(o.orderTotalAfterTax)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 relative z-10">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</span>
                                                                <p className="text-sm font-bold text-gray-900">{o.orderReceiverName}</p>
                                                            </div>

                                                            <div className="flex items-center justify-between border-t border-border pt-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vencimiento</span>
                                                                    <p className="text-xs font-bold text-gray-500">{new Date(o.dueDate).toLocaleDateString()}</p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Future: notification logic
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg ${o.status === "PAID"
                                                                        ? "bg-emerald-500 shadow-emerald-500/20 cursor-default"
                                                                        : "bg-[hsl(0,84%,60%)] shadow-[hsl(0,84%,60%,0.2)]"
                                                                        }`}
                                                                    disabled={o.status === "PAID"}
                                                                >
                                                                    {o.status === "PAID" ? "Pago Registrado" : "Notificar Pago"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {activeTab === "by-customer" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {byCustomer
                                                .filter(c => c.customer.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map((c, idx) => (
                                                    <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:shadow-2xl hover:shadow-[hsl(209,79%,35%,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6 shadow-sm group">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-100 group-hover:scale-110 group-hover:bg-[hsl(209,79%,35%,0.05)] transition-all duration-500">
                                                                <Users className="h-7 w-7 text-[hsl(209,79%,45%)]" />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1">
                                                            <h4 className="text-base font-black text-[hsl(209,79%,27%)] line-clamp-2 min-h-[48px] leading-tight font-sans tracking-tight">
                                                                {c.customer}
                                                            </h4>
                                                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Consolidado</span>
                                                                <span className="text-2xl font-black text-[hsl(209,79%,35%)] tracking-tighter">
                                                                    {formatCurrency(c.balance)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </main>

            {/* Invoice Detail Modal */}
            <AnimatePresence>
                {isDetailModalOpen && selectedInvoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsDetailModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[hsl(209,79%,27%)] to-[hsl(209,79%,17%)] text-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                        <FileText className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black font-sans tracking-tight">Detalle de Factura</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedInvoice.status === "PAID" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>
                                                {selectedInvoice.status === "PAID" ? "Pagada" : "Vencida"}
                                            </span>
                                        </div>
                                        <p className="text-white/60 text-sm font-medium">{selectedInvoice.orderPrefix}-{selectedInvoice.orderId} • Creada el {new Date(selectedInvoice.orderDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="p-3 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left Column: Info */}
                                    <div className="lg:col-span-2 space-y-8">
                                        {/* Customer Card */}
                                        <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 space-y-4">
                                            <div className="flex items-center gap-3 text-[hsl(209,79%,27%)]">
                                                <Users className="h-5 w-5" />
                                                <h4 className="font-black text-sm uppercase tracking-widest">Información del Cliente</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Nombre / Razón Social</p>
                                                    <p className="text-sm font-bold text-gray-900">{selectedInvoice.orderReceiverName}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">NIT / Documento</p>
                                                    <p className="text-sm font-bold text-gray-900">{selectedInvoice.orderReceiverNit}</p>
                                                </div>
                                                <div className="space-y-1 flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                                                        <p className="text-sm font-medium text-gray-600">{selectedInvoice.orderReceiverAddress || "No registrada"}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 flex items-start gap-2">
                                                    <Phone className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Teléfono</p>
                                                        <p className="text-sm font-medium text-gray-600">{selectedInvoice.orderReceiverPhone || "No registrado"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Document Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-6 rounded-3xl border border-gray-100 space-y-3">
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <h4 className="font-black text-[10px] uppercase tracking-widest">Seguridad y DIAN</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase">CUFE</p>
                                                        <p className="text-[11px] font-medium text-gray-500 break-all leading-tight">{selectedInvoice.cufe || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase">Resolución</p>
                                                        <p className="text-sm font-bold text-gray-700">{selectedInvoice.orderResolution || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 rounded-3xl border border-gray-100 space-y-3">
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <Calendar className="h-4 w-4" />
                                                    <h4 className="font-black text-[10px] uppercase tracking-widest">Fechas Clave</h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase">Emisión</p>
                                                        <p className="text-sm font-bold text-gray-700">{new Date(selectedInvoice.orderDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase">Vencimiento</p>
                                                        <p className="text-sm font-bold text-red-500">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Internal Notes */}
                                        <div className="p-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 space-y-2">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Info className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Notas Internas</span>
                                            </div>
                                            <p className="text-sm text-gray-500 italic">
                                                {selectedInvoice.note || "Sin notas adicionales para esta factura."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Column: Financials */}
                                    <div className="space-y-4">
                                        <div className="p-8 rounded-[2rem] bg-gradient-to-b from-[hsl(209,79%,27%)] to-[hsl(209,79%,15%)] text-white space-y-6 shadow-xl border border-white/5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Factura</span>
                                                <span className="text-4xl font-black tracking-tighter">
                                                    {formatCurrency(selectedInvoice.orderTotalAfterTax)}
                                                </span>
                                            </div>

                                            <div className="space-y-4 pt-6 border-t border-white/10">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-white/40 font-medium font-sans">Subtotal</span>
                                                    <span className="font-bold font-sans">{formatCurrency(selectedInvoice.orderSubtotalBeforeTax)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-white/40 font-medium font-sans">IVA ({selectedInvoice.orderTaxPer || 0}%)</span>
                                                    <span className="font-bold font-sans">{formatCurrency(selectedInvoice.orderTotalTax)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-white/40 font-medium font-sans">Otros Impuestos</span>
                                                    <span className="font-bold font-sans">{formatCurrency(0)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-white/20 flex flex-col gap-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pagado</span>
                                                    <span className="text-xl font-bold text-emerald-400 font-sans">{formatCurrency(selectedInvoice.orderAmountPaid)}</span>
                                                </div>
                                                {selectedInvoice.status !== "PAID" && (
                                                    <div className="mt-2 p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Saldo Pendiente</span>
                                                        <span className="text-2xl font-black text-white font-sans tracking-tight leading-none">
                                                            {formatCurrency(selectedInvoice.orderTotalAmountDue)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.orderPrefix, selectedInvoice.orderId)}
                                            disabled={isDownloading}
                                            className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloading ? (
                                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <FileText className="h-4 w-4" />
                                            )}
                                            {isDownloading ? "Generando..." : "Descargar PDF"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <MobileBottomNav />
        </div>
    )
}
