import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  ShoppingBag, Plus, Search, Eye, X, Trash2,
  CheckCircle, ChevronLeft, ChevronRight, Loader2,
  Package, AlertCircle
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `Q ${(parseFloat(n) || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const ESTADO_STYLES = {
  recibida: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pendiente: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  cancelada: "bg-red-50    text-red-700    ring-1 ring-red-200",
};

const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "credito"];

const FORM_INICIAL = {
  proveedor_id: "",
  fecha: new Date().toISOString().split("T")[0],
  metodo_pago: "efectivo",
  estado: "recibida",
  notas: "",
  detalle: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

const Compras = () => {
  // Data
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [stats, setStats] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  // Modales
  const [modalNueva, setModalNueva] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);

  // Formulario nueva compra
  const [form, setForm] = useState(FORM_INICIAL);

  // ── Carga de datos ───────────────────────────────────────────────────────

  const cargarCompras = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: LIMIT,
        ...(filtroEstado !== "todos" && { estado: filtroEstado }),
      };
      const { data } = await api.get("/compras", { params });
      setCompras(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError("No se pudieron cargar las compras.");
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado]);

  const cargarCatalogos = async () => {
    try {
      const [resProv, resProd, resSt] = await Promise.all([
        api.get("/proveedores"),
        api.get("/inventario/productos"),
        api.get("/compras/estadisticas"),
      ]);

      const provData = resProv.data;
      const todos = Array.isArray(provData) ? provData : (provData?.data ?? []);
      setProveedores(todos.filter(p => p.activo === true));

      const prodData = resProd.data;
      setProductos(Array.isArray(prodData) ? prodData : (prodData?.data ?? []));

      const stData = resSt.data;
      setStats(stData?.data ?? stData ?? null);
    } catch (err) {
      console.error("Error cargando catálogos:", err);
    }
  };

  useEffect(() => { cargarCatalogos(); }, []);
  useEffect(() => { cargarCompras(); }, [cargarCompras]);

  // ── Filtro productos por proveedor seleccionado ──────────────────────────

  const productosFiltradosPorProveedor = (() => {
    if (!form.proveedor_id) return productos;
    const prov = proveedores.find(p => p.id === form.proveedor_id);
    if (!prov?.productos_suministra?.trim()) return productos;

    const ids = prov.productos_suministra
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return productos;

    return productos.filter(prod => ids.includes(prod.id));
  })();

  // ── Filtro local (búsqueda por folio/proveedor ya cargados) ─────────────

  const comprasFiltradas = compras.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.folio?.toLowerCase().includes(q) ||
      c.proveedor_nombre?.toLowerCase().includes(q)
    );
  });

  // ── Carrito / detalle del formulario ─────────────────────────────────────

  const agregarItem = (prod) => {
    setForm((prev) => {
      const existe = prev.detalle.find((i) => i.producto_id === prod.id);
      const detalle = existe
        ? prev.detalle.map((i) =>
          i.producto_id === prod.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        )
        : [
          ...prev.detalle,
          {
            producto_id: prod.id,
            nombre: prod.nombre,
            cantidad: 1,
            precio_unitario: parseFloat(prod.precio_costo) || 0,
            subtotal: parseFloat(prod.precio_costo) || 0,
          },
        ];
      return { ...prev, detalle };
    });
  };

  const quitarItem = (producto_id) =>
    setForm((prev) => ({ ...prev, detalle: prev.detalle.filter((i) => i.producto_id !== producto_id) }));

  const actualizarItem = (producto_id, field, val) => {
    setForm((prev) => ({
      ...prev,
      detalle: prev.detalle.map((i) => {
        if (i.producto_id !== producto_id) return i;
        const updated = { ...i, [field]: parseFloat(val) || 0 };
        updated.subtotal = updated.cantidad * updated.precio_unitario;
        return updated;
      }),
    }));
  };

  const subtotalForm = form.detalle.reduce((s, i) => s + i.subtotal, 0);

  // ── Guardar nueva compra ──────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (form.detalle.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/compras", {
        proveedor_id: form.proveedor_id || null,
        fecha: form.fecha,
        metodo_pago: form.metodo_pago,
        estado: form.estado,
        notas: form.notas,
        detalle: form.detalle.map(({ producto_id, cantidad, precio_unitario }) => ({
          producto_id, cantidad, precio_unitario,
        })),
      });
      setModalNueva(false);
      setForm(FORM_INICIAL);
      await Promise.all([cargarCompras(), cargarCatalogos()]);
    } catch (e) {
      setError(e.response?.data?.message || "Error al guardar la compra.");
    } finally {
      setSaving(false);
    }
  };

  // ── Recibir compra pendiente ──────────────────────────────────────────────

  const recibirCompra = async (id) => {
    try {
      await api.put(`/compras/${id}`, { estado: "recibida" });
      await cargarCompras();
    } catch {
      setError("No se pudo actualizar la compra.");
    }
  };

  // ── Ver detalle ───────────────────────────────────────────────────────────

  const verDetalle = async (compra) => {
    try {
      const { data } = await api.get(`/compras/${compra.id}`);
      setModalDetalle(data.data ?? data);
    } catch {
      setModalDetalle(compra);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="space-y-5 p-1">

        {/* ── Encabezado ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-500" />
              Compras
            </h1>
            <p className="text-sm text-gray-500">{total} compras registradas</p>
          </div>
          <button
            onClick={() => setModalNueva(true)}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Compra
          </button>
        </div>

        {/* ── Estadísticas rápidas ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total compras", value: stats.total_compras, color: "text-sky-600" },
              { label: "Monto total", value: fmt(stats.monto_total), color: "text-gray-800" },
              { label: "Pendientes", value: stats.pendientes, color: "text-amber-600" },
              { label: "Mes actual", value: fmt(stats.total_mes_actual), color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar folio o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="todos">Todos</option>
            <option value="recibida">Recibida</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
          ) : comprasFiltradas.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay compras registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Folio", "Proveedor", "Fecha", "Pago", "Total", "Estado", ""].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${h === "Total" ? "text-right" : h === "Estado" || h === "" ? "text-center" : "text-left"
                          }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comprasFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.folio}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{c.proveedor_nombre || "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{c.fecha}</td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{c.metodo_pago}</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-800">{fmt(c.total)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[c.estado] || ""}`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => verDetalle(c)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {c.estado === "pendiente" && (
                            <button
                              onClick={() => recibirCompra(c.id)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
                              title="Marcar como recibida"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Página {page} de {totalPaginas}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Modal — Nueva Compra
      ══════════════════════════════════════════════════════════════════ */}
      {modalNueva && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800 text-lg">Nueva Compra</h3>
              <button onClick={() => setModalNueva(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Campos principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select
                    value={form.proveedor_id}
                    onChange={(e) => setForm({ ...form, proveedor_id: e.target.value, detalle: [] })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                  <select
                    value={form.metodo_pago}
                    onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="recibida">Recibida (actualiza stock)</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <input
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    placeholder="Opcional..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* Selector de productos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Package className="w-4 h-4 text-gray-400" />
                  Seleccionar productos
                  {form.proveedor_id && productosFiltradosPorProveedor.length < productos.length && (
                    <span className="ml-auto text-xs text-sky-500 font-normal">
                      Filtrado por proveedor
                    </span>
                  )}
                </label>
                {productosFiltradosPorProveedor.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    {form.proveedor_id
                      ? "Este proveedor no tiene productos asociados en inventario"
                      : "No hay productos disponibles"}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-2">
                    {productosFiltradosPorProveedor.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => agregarItem(p)}
                        className="text-left p-2 rounded-lg hover:bg-sky-50 border border-gray-100 hover:border-sky-200 transition-all"
                      >
                        <p className="text-xs font-medium text-gray-700 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400">Costo: Q {p.precio_costo || 0}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabla detalle */}
              {form.detalle.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Producto</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Cant.</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Precio</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Subtotal</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.detalle.map((item) => (
                        <tr key={item.producto_id}>
                          <td className="px-3 py-2 font-medium text-gray-700">{item.nombre}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min="1" value={item.cantidad}
                              onChange={(e) => actualizarItem(item.producto_id, "cantidad", e.target.value)}
                              className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number" min="0" step="0.01" value={item.precio_unitario}
                              onChange={(e) => actualizarItem(item.producto_id, "precio_unitario", e.target.value)}
                              className="w-20 text-right border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-700">
                            Q {item.subtotal.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => quitarItem(item.producto_id)} className="text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center font-bold text-sm px-3 py-2.5 bg-gray-50 border-t border-gray-100">
                    <span className="text-gray-600">Total:</span>
                    <span className="text-sky-700 text-base">{fmt(subtotalForm)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => { setModalNueva(false); setForm(FORM_INICIAL); }}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving || form.detalle.length === 0}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  `Registrar ${form.detalle.length > 0 ? fmt(subtotalForm) : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Modal — Detalle de compra
      ══════════════════════════════════════════════════════════════════ */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800">Detalle de Compra</h3>
              <button onClick={() => setModalDetalle(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Folio</span><p className="font-mono font-medium text-gray-800">{modalDetalle.folio}</p></div>
                <div><span className="text-gray-400">Fecha</span><p className="font-medium text-gray-800">{modalDetalle.fecha}</p></div>
                <div><span className="text-gray-400">Proveedor</span><p className="font-medium text-gray-800">{modalDetalle.proveedor_nombre || "—"}</p></div>
                <div>
                  <span className="text-gray-400">Estado</span>
                  <p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[modalDetalle.estado] || ""}`}>
                      {modalDetalle.estado}
                    </span>
                  </p>
                </div>
                <div><span className="text-gray-400">Método de pago</span><p className="font-medium text-gray-800 capitalize">{modalDetalle.metodo_pago}</p></div>
              </div>

              {modalDetalle.detalle && modalDetalle.detalle.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Productos</p>
                  <div className="space-y-1">
                    {modalDetalle.detalle.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700">
                          {item.producto_nombre || item.nombre}
                          <span className="text-gray-400"> ×{item.cantidad}</span>
                        </span>
                        <span className="font-medium text-gray-800">Q {parseFloat(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center font-bold border-t border-gray-100 pt-3">
                <span className="text-gray-600">Total</span>
                <span className="text-sky-700 text-lg">{fmt(modalDetalle.total)}</span>
              </div>

              {modalDetalle.notas && (
                <p className="text-sm text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">{modalDetalle.notas}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Compras;