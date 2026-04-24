import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  Building2, Plus, Search, Edit2, Trash2,
  Phone, Mail, MapPin, CheckCircle, XCircle, X
} from "lucide-react";

const EMPTY = {
  nombre: "", contacto: "", telefono: "", email: "",
  direccion: "", productos_suministra: "", notas: "", activo: true
};

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => { loadData(); }, []);

  // ─── API calls ───────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/proveedores");
      setProveedores(data);
    } catch {
      setError("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await api.put(`/proveedores/${editId}`, form);
      } else {
        await api.post("/proveedores", form);
      }
      setModal(false);
      loadData();
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await api.delete(`/proveedores/${id}`);
      loadData();
    } catch {
      setError("Error al eliminar");
    }
  };

  // ─── Helpers ─────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setModal(true); };
  const openEdit   = (p)  => { setForm({ ...p }); setEditId(p.id); setError(""); setModal(true); };
  const set        = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const filtered = proveedores.filter(p =>
    !search ||
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.contacto?.toLowerCase().includes(search.toLowerCase()) ||
    p.productos_suministra?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── UI ──────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-500" /> Proveedores
            </h2>
            <p className="text-sm text-gray-500">{proveedores.length} proveedores registrados</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>

        {/* Error global */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No hay proveedores registrados</p>
            <button onClick={openCreate}
              className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50">
              <Plus className="w-4 h-4" /> Agregar proveedor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">

                {/* Nombre + estado */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{p.nombre}</p>
                    {p.contacto && <p className="text-sm text-gray-500">{p.contacto}</p>}
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${p.activo ? "text-green-600" : "text-gray-400"}`}>
                    {p.activo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {/* Datos de contacto */}
                <div className="space-y-1.5 text-sm text-gray-600">
                  {p.telefono  && <p className="flex items-center gap-1.5"><Phone  className="w-3.5 h-3.5 text-gray-400" />{p.telefono}</p>}
                  {p.email     && <p className="flex items-center gap-1.5"><Mail   className="w-3.5 h-3.5 text-gray-400" />{p.email}</p>}
                  {p.direccion && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{p.direccion}</p>}
                  {p.productos_suministra && (
                    <p className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-lg mt-2">
                      {p.productos_suministra}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-sky-600 hover:bg-sky-50 py-1.5 rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">
                {editId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h3>
              <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
                  <input value={form.nombre} onChange={set("nombre")} placeholder="Nombre del proveedor"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <input value={form.contacto} onChange={set("contacto")} placeholder="Nombre del contacto"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={set("telefono")} placeholder="555-123-4567"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="correo@proveedor.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input value={form.direccion} onChange={set("direccion")} placeholder="Dirección"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Productos que Suministra</label>
                  <input value={form.productos_suministra} onChange={set("productos_suministra")}
                    placeholder="Ej: Garrafones, botellas, insumos..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={form.notas} onChange={set("notas")} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="activo_prov" checked={form.activo}
                    onChange={e => setForm({ ...form, activo: e.target.checked })}
                    className="w-4 h-4 accent-sky-600" />
                  <label htmlFor="activo_prov" className="text-sm font-medium text-gray-700">
                    Proveedor activo
                  </label>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : editId ? "Actualizar" : "Crear Proveedor"}
              </button>
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}