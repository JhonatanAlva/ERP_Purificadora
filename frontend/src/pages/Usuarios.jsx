import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import {
  UserCog, Plus, Edit2, Trash2, X, Eye, EyeOff,
  Shield, Crown, User as UserIcon, Users,
  ToggleLeft, ToggleRight, KeyRound, Loader2,
  AlertCircle, CheckCircle, Lock
} from "lucide-react";

const ROL_CONFIG = {
  superadmin: { label: "Super Admin", color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200", icon: Crown },
  admin:      { label: "Admin",       color: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",           icon: Shield },
  usuario:    { label: "Usuario",     color: "bg-gray-50 text-gray-700 ring-1 ring-gray-200",        icon: UserIcon },
};

const PERMISOS = {
  superadmin: ["Todo el sistema", "Gestion de usuarios", "Reportes completos", "Configuracion", "Eliminar registros"],
  admin:      ["Ventas y clientes", "Inventario", "Compras", "Reparto", "Creditos", "Reportes"],
  usuario:    ["Registrar ventas", "Ver clientes", "Gestionar pedidos", "Registrar reparto"],
};

const FORM_INICIAL = { nombre: "", email: "", password: "", rol: "usuario" };
const PWD_INICIAL  = { password_actual: "", password_nuevo: "", confirmar: "" };

const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl
    ${type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
    {type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
    {msg}
    <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
  </div>
);

const Usuarios = () => {
  const { user: yo } = useAuth();

  const [usuarios,  setUsuarios]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [modalForm, setModalForm] = useState(false);
  const [modalPwd,  setModalPwd]  = useState(null);
  const [modalDel,  setModalDel]  = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(FORM_INICIAL);
  const [pwd,       setPwd]       = useState(PWD_INICIAL);
  const [showPwd,   setShowPwd]   = useState({ p: false, n: false, c: false });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: u }, { data: s }] = await Promise.all([
        api.get("/usuarios"),
        api.get("/usuarios/estadisticas"),
      ]);
      setUsuarios(u.data || []);
      setStats(s.data ?? s ?? null);
    } catch (e) {
      showToast(e.response?.data?.message || "Error al cargar usuarios", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditando(null); setForm(FORM_INICIAL); setModalForm(true); };
  const abrirEditar = (u) => { setEditando(u); setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol }); setModalForm(true); };

  const handleGuardar = async () => {
    if (!form.nombre.trim() || !form.email.trim()) { showToast("Nombre y correo son requeridos", "error"); return; }
    if (!editando && (!form.password || form.password.length < 6)) { showToast("La contrasena debe tener al menos 6 caracteres", "error"); return; }
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, { nombre: form.nombre, email: form.email, rol: form.rol });
        showToast("Usuario actualizado");
      } else {
        await api.post("/usuarios", form);
        showToast("Usuario creado");
      }
      setModalForm(false);
      cargar();
    } catch (e) {
      showToast(e.response?.data?.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarPwd = async () => {
    if (!pwd.password_nuevo || pwd.password_nuevo.length < 6) { showToast("La contrasena debe tener al menos 6 caracteres", "error"); return; }
    if (pwd.password_nuevo !== pwd.confirmar) { showToast("Las contrasenas no coinciden", "error"); return; }
    setSaving(true);
    try {
      await api.put(`/usuarios/${modalPwd.id}/password`, { password_nuevo: pwd.password_nuevo, password_actual: pwd.password_actual });
      showToast("Contrasena actualizada");
      setModalPwd(null);
      setPwd(PWD_INICIAL);
    } catch (e) {
      showToast(e.response?.data?.message || "Error al cambiar contrasena", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u) => {
    try {
      await api.put(`/usuarios/${u.id}/toggle`);
      showToast(u.activo ? "Usuario desactivado" : "Usuario activado");
      cargar();
    } catch (e) {
      showToast(e.response?.data?.message || "Error", "error");
    }
  };

  const handleEliminar = async () => {
    setSaving(true);
    try {
      await api.delete(`/usuarios/${modalDel.id}`);
      showToast("Usuario eliminado");
      setModalDel(null);
      cargar();
    } catch (e) {
      showToast(e.response?.data?.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="space-y-5 p-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-500" /> Usuarios
            </h1>
            <p className="text-sm text-gray-500">{stats?.total ?? 0} usuarios · {stats?.activos ?? 0} activos</p>
          </div>
          <button onClick={abrirCrear} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Total",       value: stats.total,       color: "text-gray-800" },
              { label: "Activos",     value: stats.activos,     color: "text-emerald-600" },
              { label: "Inactivos",   value: stats.inactivos,   color: "text-red-500" },
              { label: "Super Admin", value: stats.superadmins, color: "text-purple-600" },
              { label: "Admin",       value: stats.admins,      color: "text-sky-600" },
              { label: "Usuarios",    value: stats.usuarios,    color: "text-gray-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Usuario", "Correo", "Rol", "Estado", "Creado", ""].map((h) => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${h === "Estado" || h === "" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuarios.map((u) => {
                    const cfg  = ROL_CONFIG[u.rol] || ROL_CONFIG.usuario;
                    const Icon = cfg.icon;
                    const esYo = u.id === yo?.id;
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.activo ? "opacity-50" : ""} ${esYo ? "bg-purple-50/30" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.activo ? "bg-purple-100" : "bg-gray-100"}`}>
                              <Icon className={`w-4 h-4 ${u.activo ? "text-purple-600" : "text-gray-400"}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.nombre}</p>
                              {esYo && <p className="text-xs text-purple-600 font-medium">Tu</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => !esYo && handleToggle(u)} disabled={esYo}
                            title={esYo ? "No puedes desactivarte a ti mismo" : u.activo ? "Desactivar" : "Activar"}
                            className="disabled:cursor-not-allowed">
                            {u.activo ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{u.created_at}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setModalPwd(u); setPwd(PWD_INICIAL); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Cambiar contrasena">
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {!esYo && (
                              <button onClick={() => setModalDel(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-500" /> Roles del Sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(ROL_CONFIG).map(([rol, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={rol} className={`rounded-xl p-4 border ${rol === "superadmin" ? "border-purple-100 bg-purple-50/40" : rol === "admin" ? "border-sky-100 bg-sky-50/40" : "border-gray-100 bg-gray-50/40"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-4 h-4 ${rol === "superadmin" ? "text-purple-600" : rol === "admin" ? "text-sky-600" : "text-gray-500"}`} />
                    <span className="font-semibold text-gray-800 text-sm">{cfg.label}</span>
                  </div>
                  <ul className="space-y-1">
                    {PERMISOS[rol].map((p) => (
                      <li key={p} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <UserCog className="w-5 h-5 text-purple-500" />
                {editando ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button onClick={() => setModalForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena *</label>
                  <div className="relative">
                    <input type={showPwd.p ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimo 6 caracteres"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button type="button" onClick={() => setShowPwd(s => ({ ...s, p: !s.p }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd.p ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalForm(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editando ? "Guardar cambios" : "Crear Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contrasena */}
      {modalPwd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" /> Cambiar Contrasena
              </h3>
              <button onClick={() => setModalPwd(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                Cambiando contrasena de <strong>{modalPwd.nombre}</strong>
              </div>
              {modalPwd.id === yo?.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena actual *</label>
                  <div className="relative">
                    <input type={showPwd.p ? "text" : "password"} value={pwd.password_actual} onChange={(e) => setPwd({ ...pwd, password_actual: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    <button type="button" onClick={() => setShowPwd(s => ({ ...s, p: !s.p }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd.p ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena *</label>
                <div className="relative">
                  <input type={showPwd.n ? "text" : "password"} value={pwd.password_nuevo} onChange={(e) => setPwd({ ...pwd, password_nuevo: e.target.value })} placeholder="Minimo 6 caracteres"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <button type="button" onClick={() => setShowPwd(s => ({ ...s, n: !s.n }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd.n ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena *</label>
                <div className="relative">
                  <input type={showPwd.c ? "text" : "password"} value={pwd.confirmar} onChange={(e) => setPwd({ ...pwd, confirmar: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 ${pwd.confirmar && pwd.confirmar !== pwd.password_nuevo ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-amber-300"}`} />
                  <button type="button" onClick={() => setShowPwd(s => ({ ...s, c: !s.c }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd.c ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwd.confirmar && pwd.confirmar !== pwd.password_nuevo && (
                  <p className="text-xs text-red-500 mt-1">Las contrasenas no coinciden</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalPwd(null)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleCambiarPwd} disabled={saving || (pwd.confirmar && pwd.confirmar !== pwd.password_nuevo)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Actualizar Contrasena"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {modalDel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg text-gray-800">Eliminar usuario?</h3>
              <p className="text-sm text-gray-500">
                Se eliminara permanentemente a <span className="font-semibold text-gray-700">"{modalDel.nombre}"</span>. Esta accion no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalDel(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleEliminar} disabled={saving} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Eliminando...</> : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Usuarios;