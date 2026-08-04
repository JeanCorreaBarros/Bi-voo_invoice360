"use client"

// Sidebar único para los módulos que tienen navegación propia (Contabilidad,
// Inventario). Antes había un componente por módulo, idénticos salvo la lista
// de items; acá solo cambia el registro de secciones según el módulo.
//
// En escritorio se puede colapsar a una barra de iconos para dejarle el ancho
// completo a las tablas anchas (Balance comparativo, Kardex...). La
// preferencia se guarda en localStorage y es compartida por ambos módulos.

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ListTree, BookText, Landmark, BookOpen, Scale, Settings2,
  BarChart3, TrendingUp, Wallet, Building2, ClipboardCheck, Package, Lock,
  Percent, PiggyBank, History, Activity, FileQuestion, Receipt,
  Boxes, Warehouse, ArrowRightLeft, PackagePlus, CalendarClock,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"

export type ModuleKey = "contabilidad" | "inventario"

type SidebarSection = {
  title: string
  items: { icon: any; label: string; href: string }[]
}

const MODULES: Record<ModuleKey, { root: string; sections: SidebarSection[] }> = {
  contabilidad: {
    root: "/contabilidad",
    sections: [
      {
        title: "General",
        items: [
          { icon: LayoutDashboard, label: "Resumen", href: "/contabilidad" },
          { icon: ListTree, label: "Plan de Cuentas", href: "/contabilidad/plan-cuentas" },
          { icon: BookText, label: "Comprobantes", href: "/contabilidad/comprobantes" },
          { icon: Landmark, label: "Centros de Costo", href: "/contabilidad/centros-costo" },
        ],
      },
      {
        title: "Reportes",
        items: [
          { icon: BookOpen, label: "Libro Diario", href: "/contabilidad/libros" },
          { icon: BarChart3, label: "Libro Mayor", href: "/contabilidad/libro-mayor" },
          { icon: Scale, label: "Balance de Prueba", href: "/contabilidad/reportes" },
          { icon: Building2, label: "Balance General", href: "/contabilidad/balance-general" },
          { icon: TrendingUp, label: "Estado de Resultados", href: "/contabilidad/estado-resultados" },
          { icon: Activity, label: "Indicadores Financieros", href: "/contabilidad/indicadores" },
          { icon: History, label: "Estados de Cuenta", href: "/contabilidad/estados-cuenta" },
        ],
      },
      {
        title: "Tesorería",
        items: [
          { icon: Wallet, label: "Bancos", href: "/contabilidad/bancos" },
          { icon: ClipboardCheck, label: "Conciliación Bancaria", href: "/contabilidad/conciliacion" },
        ],
      },
      {
        title: "Cuentas por Pagar",
        items: [{ icon: Wallet, label: "Pagos a Proveedores", href: "/contabilidad/pagos-proveedores" }],
      },
      {
        title: "Activos Fijos",
        items: [{ icon: Package, label: "Activos Fijos", href: "/contabilidad/activos-fijos" }],
      },
      {
        title: "Cierre",
        items: [{ icon: Lock, label: "Cierre Contable", href: "/contabilidad/cierre" }],
      },
      {
        title: "Configuración",
        items: [
          { icon: Settings2, label: "Configuración Contable", href: "/contabilidad/configuracion" },
          { icon: Percent, label: "Impuestos", href: "/contabilidad/impuestos" },
          { icon: Receipt, label: "Declaración de Renta", href: "/contabilidad/declaracion-renta" },
          { icon: PiggyBank, label: "Presupuestos", href: "/contabilidad/presupuestos" },
          { icon: History, label: "Auditoría", href: "/contabilidad/auditoria" },
        ],
      },
      {
        title: "Ayuda",
        items: [{ icon: FileQuestion, label: "Documentación", href: "/contabilidad/documentacion" }],
      },
    ],
  },

  inventario: {
    root: "/inventario",
    sections: [
      {
        title: "General",
        items: [
          { icon: LayoutDashboard, label: "Resumen", href: "/inventario" },
          { icon: Package, label: "Catálogo", href: "/inventario/catalogo" },
        ],
      },
      {
        title: "Existencias",
        items: [
          { icon: Boxes, label: "Existencias", href: "/inventario/existencias" },
          { icon: History, label: "Movimientos (Kardex)", href: "/inventario/movimientos" },
        ],
      },
      {
        title: "Bodegas",
        items: [
          { icon: Warehouse, label: "Bodegas", href: "/inventario/bodegas" },
          { icon: ArrowRightLeft, label: "Transferencias", href: "/inventario/transferencias" },
        ],
      },
      {
        title: "Kits y Lotes",
        items: [
          { icon: PackagePlus, label: "Kits y Combos", href: "/inventario/kits" },
          { icon: CalendarClock, label: "Lotes", href: "/inventario/lotes" },
        ],
      },
    ],
  },
}

const COLLAPSED_STORAGE_KEY = "bi360:module-sidebar-collapsed"

function useIsActive(root: string) {
  const pathname = usePathname()
  return (href: string) => pathname === href || (href !== root && pathname?.startsWith(href))
}

// La preferencia se lee en un efecto (no en el useState inicial) porque el
// servidor no tiene localStorage: leerla en el render inicial produce un
// mismatch de hidratación.
function useCollapsedPreference() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1")
    } catch {
      // localStorage bloqueado (modo privado): se queda expandido.
    }
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0")
      } catch {
        // Sin persistencia, pero el toggle sigue funcionando en la sesión.
      }
      return next
    })
  }

  return { collapsed, toggle }
}

export function ModuleSidebar({ module }: { module: ModuleKey }) {
  const { root, sections } = MODULES[module]
  const router = useRouter()
  const isActive = useIsActive(root)
  const { collapsed, toggle } = useCollapsedPreference()

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-100 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-out ${
        collapsed ? "w-16 px-2 py-4" : "w-64 px-3 py-4"
      }`}
      aria-label={`Navegación de ${module}`}
    >
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        aria-expanded={!collapsed}
        className={`flex items-center gap-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[hsl(209,79%,35%)] transition-colors shrink-0 mb-3 ${
          collapsed ? "justify-center h-9 w-full" : "self-end h-9 px-2.5"
        }`}
      >
        {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        {!collapsed && <span className="text-xs font-semibold">Ocultar</span>}
      </button>

      <div className={collapsed ? "space-y-2" : "space-y-4"}>
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {collapsed ? (
              <div className="h-px bg-gray-100 mx-2 my-2" aria-hidden="true" />
            ) : (
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">
                {section.title}
              </p>
            )}

            {section.items.map((item) => {
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center rounded-xl text-sm font-medium text-left transition-all duration-150 w-full ${
                    collapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-[hsl(209,79%,35%)] text-white shadow-sm"
                      : "text-gray-500 hover:bg-[hsl(209,79%,35%,0.08)] hover:text-[hsl(209,79%,35%)]"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {collapsed ? (
                    // Tooltip propio: el `title` nativo tarda ~1s en salir y
                    // con una barra de solo iconos se necesita inmediato.
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100"
                    >
                      {item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}

// Versión móvil: tab-bar horizontal scrolleable (todos los items, sin
// secciones, para que quepa en una barra), se usa dentro del layout en vez
// del sidebar fijo (que solo aparece en lg+).
export function ModuleMobileTabs({ module }: { module: ModuleKey }) {
  const { root, sections } = MODULES[module]
  const router = useRouter()
  const isActive = useIsActive(root)
  const allItems = sections.flatMap((s) => s.items)

  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-100 bg-white scrollbar-hide">
      {allItems.map((item) => {
        const active = isActive(item.href)
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 ${
              active ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-50 text-gray-500"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
