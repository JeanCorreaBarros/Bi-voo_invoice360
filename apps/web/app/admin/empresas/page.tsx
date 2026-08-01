"use client";

import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusIcon,
  Building2,
  Power,
  ShieldAlert,
  Mail,
  User,
  Lock,
  Hash,
  Pencil,
  Phone,
} from "lucide-react";

type Company = {
  id: string;
  businessName: string;
  tradeName?: string | null;
  nit: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/";

function Field({
  label,
  value,
  id,
  onChange,
  type = "text",
  icon: Icon,
}: {
  label: string;
  value: string;
  id?: string;
  type?: string;
  onChange: (v: string) => void;
  icon?: any;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 text-sm text-gray-900 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900 ${Icon ? "pl-11" : "px-4"}`}
        />
      </div>
    </div>
  );
}

export default function EmpresasAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  const emptyForm = {
    businessName: "",
    nit: "",
    tradeName: "",
    email: "",
    phone: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  };
  const [form, setForm] = useState(emptyForm);

  const getToken = () => {
    try {
      return sessionStorage.getItem("token");
    } catch {
      return null;
    }
  };

  // Gate: solo usuarios con el permiso company.manage (SUPER_ADMIN)
  useEffect(() => {
    try {
      const permissions: string[] = JSON.parse(localStorage.getItem("permissions") || "[]");
      if (!permissions.includes("company.manage")) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
    } catch {
      setAuthorized(false);
    }
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${apiBase}companies`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) fetchCompanies();
  }, [authorized]);

  const fetchCompanyAdmin = async (companyId: string) => {
    setLoadingAdmin(true);
    setEditingAdminId(null);
    try {
      const token = getToken();
      const res = await fetch(`${apiBase}users?companyId=${companyId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return;
      const data = await res.json();
      const users: any[] = Array.isArray(data) ? data : data?.data ?? [];
      // Tomar el primer usuario ADMIN de la empresa
      const admin = users.find((u: any) => u.roles?.some((r: any) => r.role?.name === "ADMIN")) || users[0];
      if (admin) {
        setEditingAdminId(admin.id);
        setForm((prev) => ({ ...prev, adminName: admin.name || "", adminEmail: admin.email || "" }));
      }
    } catch (err) {
      console.error("Error fetching admin:", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleSave = async () => {
    if (!form.businessName || !form.nit) {
      toast.error("Razón social y NIT son obligatorios");
      return;
    }
    
    if (!editingId && (!form.adminName || !form.adminEmail || !form.adminPassword)) {
      toast.error("Completa los datos del administrador");
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      
      const payload = editingId 
        ? {
            businessName: form.businessName,
            nit: form.nit,
            tradeName: form.tradeName || undefined,
            email: form.email || undefined,
            phone: form.phone || undefined,
          }
        : {
            company: {
              businessName: form.businessName,
              nit: form.nit,
              tradeName: form.tradeName || undefined,
              email: form.email || undefined,
              phone: form.phone || undefined,
            },
            admin: {
              name: form.adminName,
              email: form.adminEmail,
              password: form.adminPassword,
            },
          };

      const url = editingId ? `${apiBase}companies/${editingId}` : `${apiBase}companies`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.message || (editingId ? "Error al actualizar la empresa" : "Error al crear la empresa"));
        return;
      }

      // Si estamos editando la empresa y llenaron los datos del admin
      if (editingId && (form.adminName || form.adminEmail || form.adminPassword)) {
        if (editingAdminId) {
          // Actualizar admin existente
          const adminPayload: any = {};
          if (form.adminName) adminPayload.name = form.adminName;
          if (form.adminEmail) adminPayload.email = form.adminEmail;
          if (form.adminPassword) adminPayload.password = form.adminPassword;
          try {
            await fetch(`${apiBase}users/${editingAdminId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(adminPayload),
            });
          } catch { /* ignorar error de admin */ }
        } else {
          // No había admin y llenaron los campos: crearlo
          try {
            await fetch(`${apiBase}users`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                name: form.adminName,
                email: form.adminEmail,
                password: form.adminPassword || "123456", // requiere password
                companyId: editingId,
                roleIds: [] // El backend asume que le damos un rol? O default ADMIN?
              }),
            });
          } catch { /* ignorar error de creación */ }
        }
      }

      toast.success(editingId ? "Empresa actualizada correctamente" : "Empresa creada correctamente");
      setIsModalOpen(false);
      setEditingId(null);
      setEditingAdminId(null);
      setForm(emptyForm);
      await fetchCompanies();
    } catch {
      toast.error(editingId ? "Error al actualizar la empresa" : "Error al crear la empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (company: Company) => {
    try {
      const token = getToken();
      const endpoint = company.active ? "" : "/activate";
      const method = company.active ? "DELETE" : "PATCH";

      const res = await fetch(`${apiBase}companies/${company.id}${endpoint}`, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) {
        toast.error("Error al cambiar el estado");
        return;
      }

      await fetchCompanies();
      toast.success(`Empresa ${company.active ? "desactivada" : "activada"}`);
    } catch {
      toast.error("Error al cambiar el estado");
    }
  };

  if (authorized === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Verificando acceso...</div>;
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-300" />
        <h1 className="text-lg font-bold text-gray-800">Acceso restringido</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Esta sección es exclusiva para administradores de plataforma (SUPER_ADMIN).
        </p>
        <Button onClick={() => router.push("/")} className="bg-blue-950 hover:bg-blue-800 text-white rounded-xl">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />

      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Empresas</h1>
              <p className="text-sm text-gray-500">Administra los clientes (tenants) de la plataforma</p>
            </div>
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setIsModalOpen(true);
              }}
              className="h-10 bg-blue-950 hover:bg-blue-800 text-white flex items-center gap-2 text-sm px-4 rounded-xl"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Empresa</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando empresas...</div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay empresas registradas todavía</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Razón social", "NIT", "Correo", "Estado", "Acciones"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{c.businessName}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{c.nit}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{c.email || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-5 py-4 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Editar empresa"
                          onClick={async () => {
                            setEditingId(c.id);
                            setEditingAdminId(null);
                            setForm({
                              ...emptyForm,
                              businessName: c.businessName,
                              nit: c.nit,
                              tradeName: c.tradeName || "",
                              email: c.email || "",
                              phone: c.phone || "",
                            });
                            setIsModalOpen(true);
                            // Cargar admin en paralelo
                            fetchCompanyAdmin(c.id);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-lg ${c.active ? "text-green-600 hover:bg-red-50 hover:text-red-500" : "text-gray-400 hover:bg-green-50 hover:text-green-600"}`}
                          title={c.active ? "Desactivar empresa" : "Activar empresa"}
                          onClick={() => handleToggle(c)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-xl max-h-[94dvh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">
              {editingId ? "Editar Empresa" : "Nueva Empresa"}
            </DialogTitle>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {editingId ? "Actualizar datos de la empresa" : "Datos de la empresa y su primer administrador"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Empresa</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Field label="Razón Social" id="businessName" icon={Building2} value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
                </div>
                <Field label="NIT" id="nit" icon={Hash} value={form.nit} onChange={(v) => setForm({ ...form, nit: v })} />
                <Field label="Nombre comercial" id="tradeName" icon={Building2} value={form.tradeName} onChange={(v) => setForm({ ...form, tradeName: v })} />
                <Field label="Correo" id="companyEmail" type="email" icon={Mail} value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Teléfono" id="phone" type="tel" icon={Phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100 relative mt-4">
              {loadingAdmin && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                  <span className="text-sm font-bold text-[hsl(209,79%,27%)] animate-pulse">Cargando administrador...</span>
                </div>
              )}
              {editingId && !loadingAdmin && !editingAdminId && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl text-sm mb-3">
                  No se encontró un administrador para esta empresa. {form.adminEmail ? '' : 'Puedes asignar uno llenando estos datos.'}
                </div>
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-3">
                {editingId ? "Administrador Principal" : "Primer administrador"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Field label="Nombre" id="adminName" icon={User} value={form.adminName} onChange={(v) => setForm({ ...form, adminName: v })} />
                </div>
                <div className="md:col-span-2">
                  <Field label="Correo" id="adminEmail" type="email" icon={Mail} value={form.adminEmail} onChange={(v) => setForm({ ...form, adminEmail: v })} />
                </div>
                <div className="md:col-span-2">
                  <Field label={editingId ? "Contraseña (opcional, para cambiarla)" : "Contraseña"} id="adminPassword" type="password" icon={Lock} value={form.adminPassword} onChange={(v) => setForm({ ...form, adminPassword: v })} />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 backdrop-blur-md border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => { setIsModalOpen(false); setForm(emptyForm); setEditingId(null); }}
              className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] h-12 bg-[hsl(209,79%,27%)] hover:bg-[hsl(209,79%,32%)] text-white font-black rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Empresa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
