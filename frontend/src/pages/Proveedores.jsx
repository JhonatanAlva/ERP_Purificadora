import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  X,
  Package,
} from "lucide-react";

const EMPTY = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  productos_suministra: "",
  notas: "",
  activo: true,
};

const EMPTY_PROD = {
  nombre: "",
  tipo: "garrafon_lleno",
  descripcion: "",
  precio_venta: 0,
  precio_costo: 0,
  stock_actual: 0,
  stock_minimo: 10,
  unidad: "pieza",
  activo: true,
};

const TIPO_LABELS = {
  garrafon_lleno: "Garrafón Lleno",
  garrafon_vacio: "Garrafón Vacío",
  botella: "Botella",
  otro: "Otro",
};

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [productosInventario, setProductosInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Mini-modal nuevo producto
  const [modalProd, setModalProd] = useState(false);
  const [formProd, setFormProd] = useState(EMPTY_PROD);
  const [savingProd, setSavingProd] = useState(false);
  const [errorProd, setErrorProd] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: provData }, { data: prodData }] = await Promise.all([
        api.get("/proveedores"),
        api.get("/inventario/productos"),
      ]);
      setProveedores(provData);
      setProductosInventario(
        prodData.filter((p) => p.activo === true || p.activo === "true"),
      );
    } catch {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadProductos = async () => {
    try {
      const { data } = await api.get("/inventario/productos");
      setProductosInventario(
        data.filter((p) => p.activo === true || p.activo === "true"),
      );
    } catch {
      /* silencioso */
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        productos_suministra: selectedIds.join(","),
      };
      if (editId) {
        await api.put(`/proveedores/${editId}`, payload);
      } else {
        await api.post("/proveedores", payload);
      }
      setModal(false);
      loadData();
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Guardar nuevo producto desde el mini-modal ──
  const handleSaveProd = async () => {
    if (!formProd.nombre.trim()) return;
    setSavingProd(true);
    setErrorProd("");
    try {
      // const { data } = await api.post("/inventario/productos", formProd);
      // Recargar lista de productos
      await loadProductos();
      // Marcar automáticamente el nuevo producto
      // El backend devuelve el producto creado o necesitamos buscarlo por nombre
      const { data: prodData } = await api.get("/inventario/productos");
      const activos = prodData.filter(
        (p) => p.activo === true || p.activo === "true",
      );
      setProductosInventario(activos);
      const nuevo = activos.find((p) => p.nombre === formProd.nombre);
      if (nuevo) {
        setSelectedIds((prev) => [...prev, nuevo.id]);
      }
      setModalProd(false);
      setFormProd(EMPTY_PROD);
    } catch (err) {
      setErrorProd(err.response?.data?.error || "Error al crear producto.");
    } finally {
      setSavingProd(false);
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

  const openCreate = () => {
    setForm(EMPTY);
    setSelectedIds([]);
    setEditId(null);
    setError("");
    setModal(true);
  };

  const openEdit = (p) => {
    setForm({ ...p });
    const ids = p.productos_suministra
      ? p.productos_suministra
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    setSelectedIds(ids);
    setEditId(p.id);
    setError("");
    setModal(true);
  };

  const toggleProducto = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setProd = (field) => (e) =>
    setFormProd({ ...formProd, [field]: e.target.value });

  const getNombresProductos = (productos_suministra) => {
    if (!productos_suministra) return null;
    const ids = productos_suministra
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return ids
      .map((id) => productosInventario.find((p) => p.id === id)?.nombre)
      .filter(Boolean)
      .join(", ");
  };

  const filtered = proveedores.filter(
    (p) =>
      !search ||
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.contacto?.toLowerCase().includes(search.toLowerCase()),
  );

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300";

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-500" /> Proveedores
            </h2>
            <p className="text-sm text-gray-500">
              {proveedores.length} proveedores registrados
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>

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
            <button
              onClick={openCreate}
              className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50"
            >
              <Plus className="w-4 h-4" /> Agregar proveedor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const nombresProductos = getNombresProductos(
                p.productos_suministra,
              );
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{p.nombre}</p>
                      {p.contacto && (
                        <p className="text-sm text-gray-500">{p.contacto}</p>
                      )}
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${p.activo ? "text-green-600" : "text-gray-400"}`}
                    >
                      {p.activo ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {p.telefono && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {p.telefono}
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {p.email}
                      </p>
                    )}
                    {p.direccion && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {p.direccion}
                      </p>
                    )}
                    {nombresProductos && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">
                          Productos del inventario:
                        </p>
                        <p className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-lg">
                          {nombresProductos}
                        </p>
                      </div>
                    )}
                    {p.notas && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-400 mb-1">
                          Otros productos:
                        </p>
                        <p className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                          {p.notas}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-sky-600 hover:bg-sky-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          Modal — Proveedor
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">
                {editId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h3>
              <button
                onClick={() => setModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre / Razón Social *
                  </label>
                  <input
                    value={form.nombre}
                    onChange={set("nombre")}
                    placeholder="Nombre del proveedor"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contacto
                  </label>
                  <input
                    value={form.contacto}
                    onChange={set("contacto")}
                    placeholder="Nombre del contacto"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    value={form.telefono}
                    onChange={set("telefono")}
                    placeholder="555-123-4567"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="correo@proveedor.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    value={form.direccion}
                    onChange={set("direccion")}
                    placeholder="Dirección"
                    className={inputCls}
                  />
                </div>

                {/* ── Checkboxes + botón nuevo producto ── */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Productos del Inventario que Suministra
                    </label>
                    <button
                      onClick={() => {
                        setFormProd(EMPTY_PROD);
                        setErrorProd("");
                        setModalProd(true);
                      }}
                      className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo producto
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Estos productos aparecerán al crear una compra con este
                    proveedor
                  </p>
                  {productosInventario.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No hay productos en inventario
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {productosInventario.map((prod) => (
                        <label
                          key={prod.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(prod.id)}
                            onChange={() => toggleProducto(prod.id)}
                            className="w-4 h-4 accent-sky-600 shrink-0"
                          />
                          <span className="text-sm text-gray-700 truncate">
                            {prod.nombre}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedIds.length > 0 && (
                    <p className="text-xs text-sky-600 mt-1.5">
                      {selectedIds.length} producto
                      {selectedIds.length > 1 ? "s" : ""} seleccionado
                      {selectedIds.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* ── Otros productos ── */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Otros productos que suministra
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Productos que vende pero que no están en tu inventario
                  </p>
                  <textarea
                    value={form.notas}
                    onChange={set("notas")}
                    rows={2}
                    placeholder="Ej: agua en pipa, bidones industriales, servicio de entrega..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activo_prov"
                    checked={form.activo}
                    onChange={(e) =>
                      setForm({ ...form, activo: e.target.checked })
                    }
                    className="w-4 h-4 accent-sky-600"
                  />
                  <label
                    htmlFor="activo_prov"
                    className="text-sm font-medium text-gray-700"
                  >
                    Proveedor activo
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre.trim()}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving
                  ? "Guardando..."
                  : editId
                    ? "Actualizar"
                    : "Crear Proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Mini-modal — Nuevo Producto (z-60 para estar encima)
      ══════════════════════════════════════════════════════ */}
      {modalProd && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Nuevo Producto
              </h3>
              <button
                onClick={() => setModalProd(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorProd && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {errorProd}
                </p>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nombre *
                </label>
                <input
                  placeholder="Nombre del producto"
                  value={formProd.nombre}
                  onChange={setProd("nombre")}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tipo
                  </label>
                  <select
                    value={formProd.tipo}
                    onChange={setProd("tipo")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  >
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Unidad
                  </label>
                  <input
                    value={formProd.unidad}
                    onChange={setProd("unidad")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    value={formProd.precio_venta}
                    onChange={setProd("precio_venta")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Precio Costo
                  </label>
                  <input
                    type="number"
                    value={formProd.precio_costo}
                    onChange={setProd("precio_costo")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    value={formProd.stock_actual}
                    onChange={setProd("stock_actual")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    value={formProd.stock_minimo}
                    onChange={setProd("stock_minimo")}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Descripción
                </label>
                <input
                  placeholder="Descripción opcional"
                  value={formProd.descripcion}
                  onChange={setProd("descripcion")}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModalProd(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProd}
                disabled={savingProd || !formProd.nombre.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {savingProd ? "Creando..." : "Crear y seleccionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
