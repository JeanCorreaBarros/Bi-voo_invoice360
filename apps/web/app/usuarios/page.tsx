"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Plus, Edit, Search, ChevronLeft, ChevronRight,
  User, Mail, Shield, Key, UserCog, Users, ShieldCheck,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import toast from "react-hot-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const _apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/"
const API_BASE = _apiUrl.endsWith("/") ? _apiUrl.slice(0, -1) : _apiUrl

// ─── Permission label map ────────────────────────────────────────────
// Debe reflejar los permisos sembrados en apps/api/src/seed/tenantRoles.js.
const PERMISSION_LABELS: Record<string, { label: string; group: string }> = {
  "user.create":          { label: "Crear usuarios",              group: "Usuarios" },
  "user.read":            { label: "Ver usuarios",                group: "Usuarios" },
  "user.update":          { label: "Editar usuarios",             group: "Usuarios" },
  "user.toggle":          { label: "Activar/desactivar usuarios", group: "Usuarios" },
  "user.change_password": { label: "Cambiar contraseñas",         group: "Usuarios" },
  "role.create":          { label: "Crear roles",                 group: "Roles" },
  "role.read":            { label: "Ver roles",                   group: "Roles" },
  "role.update":          { label: "Editar roles",                group: "Roles" },
  "role.delete":          { label: "Eliminar roles",              group: "Roles" },
  "product.create":       { label: "Crear productos",             group: "Productos" },
  "product.read":         { label: "Ver productos",               group: "Productos" },
  "product.update":       { label: "Editar productos",            group: "Productos" },
  "product.delete":       { label: "Eliminar productos",          group: "Productos" },
  "accounting.entry.read":       { label: "Ver comprobantes y reportes", group: "Contabilidad" },
  "accounting.entry.manage":     { label: "Crear/anular comprobantes",   group: "Contabilidad" },
  "accounting.account.manage":   { label: "Administrar plan de cuentas", group: "Contabilidad" },
  "accounting.costcenter.manage":{ label: "Administrar centros de costo",group: "Contabilidad" },
  "accounting.settings.manage":  { label: "Configuración contable",      group: "Contabilidad" },
  "accounting.audit.read":       { label: "Ver auditoría",               group: "Contabilidad" },
}

const ALL_PERMISSION_CODES = Object.keys(PERMISSION_LABELS)

const PERMISSION_GROUPS = ["Usuarios", "Roles", "Productos", "Contabilidad"] as const

const GROUP_COLORS: Record<string, string> = {
  Usuarios:     "bg-blue-50 text-blue-700 border-blue-200",
  Roles:        "bg-purple-50 text-purple-700 border-purple-200",
  Productos:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Contabilidad: "bg-orange-50 text-orange-700 border-orange-200",
}

// ─── Interfaces ──────────────────────────────────────────────────────
interface Role     { id: string; name: string; description?: string; permissions: Permission[] }
interface Permission { id: string; code: string; description?: string }
interface UserRole { userId: string; roleId: string; role: { id: string; name: string } }
interface User     { id: string; name: string; email: string; active: boolean; roles?: UserRole[]; createdAt: string }
interface SimpleRole { id: string; name: string }

// ─── Mobile User Card ────────────────────────────────────────────────
function UserCard({ user, onEdit }: { user: User; onEdit: (u: User) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(209,79%,27%)] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{user.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
          {user.active ? "Activo" : "Inactivo"}
        </span>
      </div>
      {user.roles && user.roles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((ur) => (
            <span key={ur.roleId} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {ur.role.name}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => onEdit(user)}
        className="w-full flex items-center justify-center gap-2 p-2 hover:bg-gray-50 rounded-xl transition-colors text-blue-600 border border-blue-200 text-sm font-medium"
      >
        <Edit className="h-4 w-4" /> Editar
      </button>
    </div>
  )
}

// ─── Role Card ───────────────────────────────────────────────────────
function RoleCard({ role, onEdit, onDelete }: { role: Role; onEdit: (r: Role) => void; onDelete: (r: Role) => void }) {
  const [expanded, setExpanded] = useState(false)
  // ADMIN se siembra al crear la empresa y lo tiene el primer administrador:
  // el backend rechaza editarlo o borrarlo, así que tampoco se ofrece aquí.
  const isSystemRole = role.name === "ADMIN"

  const permsByGroup = useMemo(() => {
    const groups: Record<string, string[]> = {}
    role.permissions.forEach((p) => {
      const info = PERMISSION_LABELS[p.code]
      const group = info?.group || "Otros"
      if (!groups[group]) groups[group] = []
      groups[group].push(p.code)
    })
    return groups
  }, [role.permissions])

  const allPerms = ALL_PERMISSION_CODES
  const roleCodes = new Set(role.permissions.map((p) => p.code))

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 pr-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(209,79%,27%,0.08)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[hsl(209,79%,27%)]" />
            </div>
            <div>
              <p className="font-bold text-gray-900 flex items-center gap-2">
                {role.name}
                {isSystemRole && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Sistema
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {role.description || `${role.permissions.length} permisos asignados`}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {!isSystemRole && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(role)}
              title="Editar rol"
              className="p-2 rounded-lg text-[hsl(209,79%,27%)] hover:bg-blue-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(role)}
              title="Eliminar rol"
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          {/* Permission groups summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(permsByGroup).map(([group, codes]) => (
              <span key={group} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${GROUP_COLORS[group] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {group}: {codes.length}
              </span>
            ))}
          </div>

          {/* All permissions checklist */}
          <div className="space-y-3">
            {PERMISSION_GROUPS.map((group) => {
              const groupPerms = allPerms.filter((code) => PERMISSION_LABELS[code]?.group === group)
              if (groupPerms.length === 0) return null
              return (
                <div key={group}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 px-2 py-0.5 rounded w-fit border ${GROUP_COLORS[group]}`}>{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {groupPerms.map((code) => {
                      const has = roleCodes.has(code)
                      return (
                        <div key={code} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${has ? "bg-emerald-50" : "bg-gray-50"}`}>
                          {has
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                          }
                          <span className={`text-xs font-medium ${has ? "text-gray-800" : "text-gray-400"}`}>
                            {PERMISSION_LABELS[code]?.label || code}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function UsuariosPage() {
  const [activeTab, setActiveTab] = useState<"usuarios" | "roles">("usuarios")

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<SimpleRole[]>([])
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "" })

  // Roles state
  const [rolesData, setRolesData] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isRoleEdit, setIsRoleEdit] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleForm, setRoleForm] = useState<{ name: string; description: string; permissionCodes: string[] }>({
    name: "", description: "", permissionCodes: [],
  })

  const itemsPerPage = 10
  const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // ── Fetch ──
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : data.data || [])
      } else {
        setUsers([])
        toast.error("Error al cargar usuarios")
      }
    } catch {
      setUsers([])
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setRoles(Array.isArray(data) ? data.map((r: any) => ({ id: r.id, name: r.name })) : [])
      }
    } catch { setRoles([]) }
  }

  const fetchRolesWithPermissions = async () => {
    setRolesLoading(true)
    try {
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setRolesData(Array.isArray(data) ? data : [])
      }
    } catch { setRolesData([]) }
    finally { setRolesLoading(false) }
  }

  useEffect(() => { fetchUsers(); fetchRoles() }, [])
  useEffect(() => { if (activeTab === "roles") fetchRolesWithPermissions() }, [activeTab])
  useEffect(() => { setCurrentPage(1) }, [search])

  // ── Roles CRUD ──
  const openRoleCreate = () => {
    setIsRoleEdit(false)
    setSelectedRoleId(null)
    setRoleForm({ name: "", description: "", permissionCodes: [] })
    setIsRoleModalOpen(true)
  }

  const openRoleEdit = (role: Role) => {
    setIsRoleEdit(true)
    setSelectedRoleId(role.id)
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissionCodes: role.permissions.map((p) => p.code),
    })
    setIsRoleModalOpen(true)
  }

  const toggleRolePermission = (code: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissionCodes: prev.permissionCodes.includes(code)
        ? prev.permissionCodes.filter((c) => c !== code)
        : [...prev.permissionCodes, code],
    }))
  }

  const toggleRoleGroup = (group: string) => {
    const groupCodes = ALL_PERMISSION_CODES.filter((c) => PERMISSION_LABELS[c].group === group)
    const allSelected = groupCodes.every((c) => roleForm.permissionCodes.includes(c))
    setRoleForm((prev) => ({
      ...prev,
      permissionCodes: allSelected
        ? prev.permissionCodes.filter((c) => !groupCodes.includes(c))
        : Array.from(new Set([...prev.permissionCodes, ...groupCodes])),
    }))
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleForm.name.trim()) { toast.error("El nombre del rol es obligatorio"); return }
    if (roleForm.permissionCodes.length === 0) { toast.error("Selecciona al menos un permiso"); return }

    setRoleSaving(true)
    try {
      const token = sessionStorage.getItem("token")
      const res = await fetch(
        isRoleEdit ? `${API_BASE}/roles/${selectedRoleId}` : `${API_BASE}/roles`,
        {
          method: isRoleEdit ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(roleForm),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar el rol")

      toast.success(isRoleEdit ? "Rol actualizado" : "Rol creado")
      setIsRoleModalOpen(false)
      fetchRolesWithPermissions()
      fetchRoles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el rol")
    } finally {
      setRoleSaving(false)
    }
  }

  const handleRoleDelete = async (role: Role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) return
    try {
      const token = sessionStorage.getItem("token")
      const res = await fetch(`${API_BASE}/roles/${role.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "No se pudo eliminar el rol")

      toast.success("Rol eliminado")
      fetchRolesWithPermissions()
      fetchRoles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el rol")
    }
  }

  // ── Filter / Paginate ──
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return []
    const term = normalize(search)
    return users.filter((u) => normalize(u.name || "").includes(term) || normalize(u.email || "").includes(term))
  }, [users, search])
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.roleId) { toast.error("Completa todos los campos obligatorios"); return }
    if (!isEdit && !form.password) { toast.error("La contraseña es obligatoria"); return }
    setLoading(true)
    const body: any = { name: form.name, email: form.email, roleIds: [form.roleId] }
    if (form.password) body.password = form.password
    try {
      const token = sessionStorage.getItem("token")
      const url = isEdit && selectedUserId ? `${API_BASE}/users/${selectedUserId}` : `${API_BASE}/users`
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? "Usuario actualizado" : "Usuario creado")
      setIsModalOpen(false)
      setForm({ name: "", email: "", password: "", roleId: "" })
      fetchUsers()
    } catch { toast.error("Error al guardar usuario") }
    finally { setLoading(false) }
  }

  const openCreate = () => { setIsEdit(false); setSelectedUserId(null); setForm({ name: "", email: "", password: "", roleId: "" }); setIsModalOpen(true) }
  const openEdit = (u: User) => { setIsEdit(true); setSelectedUserId(u.id); setForm({ name: u.name, email: u.email, password: "", roleId: u.roles?.[0]?.roleId || "" }); setIsModalOpen(true) }

  // ── Pagination pages ──
  const getPageNumbers = () => {
    const pages: Array<number | string> = []
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
    else {
      if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push("…"); pages.push(totalPages) }
      else if (currentPage >= totalPages - 2) { pages.push(1); pages.push("…"); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i) }
      else { pages.push(1); pages.push("…"); pages.push(currentPage - 1); pages.push(currentPage); pages.push(currentPage + 1); pages.push("…"); pages.push(totalPages) }
    }
    return pages
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Accesos</h1>
            <p className="text-sm text-gray-500 mt-1">Administra usuarios, roles y permisos de la plataforma</p>
          </div>
          <Button
            onClick={activeTab === "usuarios" ? openCreate : openRoleCreate}
            className="bg-[hsl(209,79%,27%)] hover:bg-[hsl(209,79%,22%)] text-white flex items-center gap-2 w-full sm:w-auto rounded-xl shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "usuarios" ? "Crear usuario" : "Crear rol"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 mb-6 w-fit shadow-sm">
          {([
            { id: "usuarios", label: "Usuarios", icon: Users },
            { id: "roles",    label: "Roles y Permisos", icon: ShieldCheck },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === id
                  ? "bg-[hsl(209,79%,27%)] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── USUARIOS TAB ── */}
        {activeTab === "usuarios" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuario por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm shadow-sm"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="w-8 h-8 border-4 border-[hsl(209,79%,27%)] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-500">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <Users className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">{search ? "Sin resultados" : "No hay usuarios registrados"}</p>
                <p className="text-sm text-gray-400 mt-1">{search ? "Intenta con otro nombre o email" : "Crea el primer usuario con el botón de arriba"}</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[hsl(209,79%,27%)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.roles?.map((ur) => (
                                <span key={ur.roleId} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                  {ur.role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${user.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-emerald-500" : "bg-red-500"}`} />
                              {user.active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => openEdit(user)}
                              className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(209,79%,27%)] hover:text-[hsl(209,79%,20%)] transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" /> Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {paginatedUsers.map((user) => <UserCard key={user.id} user={user} onEdit={openEdit} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-3 shadow-sm">
                    <p className="text-sm text-gray-600">
                      {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {getPageNumbers().map((n, i) =>
                        typeof n === "string" ? (
                          <span key={`e-${i}`} className="px-2 text-gray-400">…</span>
                        ) : (
                          <button key={n} onClick={() => setCurrentPage(n)} className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-colors ${currentPage === n ? "bg-[hsl(209,79%,27%)] text-white" : "hover:bg-gray-100 text-gray-700"}`}>
                            {n}
                          </button>
                        )
                      )}
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ROLES TAB ── */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p>Crea roles a la medida y define exactamente a qué tiene acceso cada uno. Haz clic en un rol para ver sus permisos, o usa los iconos para editarlo o eliminarlo.</p>
            </div>

            {rolesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="w-8 h-8 border-4 border-[hsl(209,79%,27%)] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-500">Cargando roles...</p>
              </div>
            ) : rolesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <ShieldCheck className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">No hay roles disponibles</p>
                <p className="text-sm text-gray-400 mt-1">Crea el primer rol con el botón de arriba</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rolesData.map((role) => (
                  <RoleCard key={role.id} role={role} onEdit={openRoleEdit} onDelete={handleRoleDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <MobileBottomNav />

      {/* ── Modal Crear / Editar Usuario ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-xl max-h-[94dvh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className={`px-6 py-5 ${isEdit ? "bg-[hsl(209,79%,27%,0.05)]" : "bg-[hsl(209,79%,27%,0.02)]"} border-b border-gray-100 flex items-center justify-between`}>
            <div>
              <DialogTitle className={`text-xl font-black ${isEdit ? "text-[hsl(209,79%,20%)]" : "text-[hsl(209,79%,27%)]"}`}>
                {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-0.5 text-gray-400">
                {isEdit ? `ID: ${selectedUserId?.split("-")[0]}...` : "Control de acceso y roles"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scrollbar-hide">
              {isEdit && (
                <div className="flex items-center gap-4 p-4 bg-[hsl(209,79%,27%,0.03)] rounded-2xl border border-[hsl(209,79%,27%,0.08)]">
                  <div className="w-12 h-12 rounded-full bg-[hsl(209,79%,27%)] flex items-center justify-center shrink-0">
                    <UserCog className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 truncate max-w-[220px]">{form.email}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Perfil de usuario</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-medium"
                    placeholder="Juan Pérez" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email / Usuario</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-medium"
                    placeholder="juan@empresa.com" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  {isEdit ? "Contraseña (Opcional)" : "Contraseña"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-medium"
                    placeholder="••••••••" required={!isEdit} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Rol Asignado</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    className="w-full h-12 pl-11 pr-10 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-bold appearance-none"
                    required>
                    <option value="" disabled>Seleccionar un rol...</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}
                className={`flex-[2] h-12 text-white font-black rounded-xl shadow-sm ${isEdit ? "bg-[hsl(209,79%,20%)] hover:bg-[hsl(209,79%,25%)]" : "bg-[hsl(209,79%,27%)] hover:bg-[hsl(209,79%,32%)]"}`}>
                {loading ? "Procesando..." : isEdit ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal Crear / Editar Rol ── */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[94dvh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.03)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              {isRoleEdit ? "Editar Rol" : "Nuevo Rol"}
            </DialogTitle>
            <p className="text-[11px] font-bold uppercase tracking-widest mt-0.5 text-gray-400">
              Define a qué tiene acceso este rol
            </p>
          </div>

          <form onSubmit={handleRoleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scrollbar-hide">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre del rol</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-medium"
                    placeholder="CONTADOR, VENDEDOR, AUXILIAR..." required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción (opcional)</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[hsl(209,79%,27%)] outline-none text-sm font-medium"
                    placeholder="Para qué sirve este rol" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                    Permisos ({roleForm.permissionCodes.length} de {ALL_PERMISSION_CODES.length})
                  </label>
                </div>

                {PERMISSION_GROUPS.map((group) => {
                  const groupCodes = ALL_PERMISSION_CODES.filter((c) => PERMISSION_LABELS[c].group === group)
                  const allSelected = groupCodes.every((c) => roleForm.permissionCodes.includes(c))
                  return (
                    <div key={group} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${GROUP_COLORS[group]}`}>
                          {group}
                        </span>
                        <button type="button" onClick={() => toggleRoleGroup(group)}
                          className="text-xs font-bold text-[hsl(209,79%,27%)] hover:underline">
                          {allSelected ? "Quitar todos" : "Seleccionar todos"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3">
                        {groupCodes.map((code) => {
                          const checked = roleForm.permissionCodes.includes(code)
                          return (
                            <label key={code}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? "bg-emerald-50 hover:bg-emerald-100" : "bg-gray-50 hover:bg-gray-100"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleRolePermission(code)}
                                className="w-4 h-4 rounded accent-emerald-600 shrink-0" />
                              <span className={`text-xs font-medium ${checked ? "text-gray-800" : "text-gray-500"}`}>
                                {PERMISSION_LABELS[code].label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsRoleModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
                Cancelar
              </Button>
              <Button type="submit" disabled={roleSaving}
                className="flex-[2] h-12 text-white font-black rounded-xl shadow-sm bg-[hsl(209,79%,27%)] hover:bg-[hsl(209,79%,32%)]">
                {roleSaving ? "Procesando..." : isRoleEdit ? "Guardar Cambios" : "Crear Rol"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}