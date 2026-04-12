import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import api from "../services/api";
import {
  ShoppingCart, Plus, Search, Trash2, X, Eye,
  ArrowUp, ArrowDown
} from "lucide-react";

const Toast = ({ msg, type }) => (
  <div className={`fixed top-5 right-5 px-4 py-3 rounded-xl text-white shadow-xl z-50 flex items-center gap-2 text-sm font-medium
    ${type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
    {type === "error" ? "✕" : "✓"} {msg}
  </div>
);

const ESTADO_COLORS = {
  pagada:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
  cancelada: "bg-red-50 text-red-600 border border-red-200",
};

const TIPO_VENTA_COLORS = {
  mostrador: "bg-blue-100 text-blue-700",
  ruta:      "bg-orange-100 text-orange-700",
  pedido:    "bg-purple-100 text-purple-700",
};

const EMPTY_FORM = {
  cliente_id: "",
  fecha: new Date().toISOString().split("T")[0],
  items: [],
  metodo_pago: "efectivo",
  tipo_venta: "mostrador",
  estado: "pagada",
  descuento: 0,
  garrafones_recibidos: 0,
  notas: "",
};

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, cRes] = await Promise.all([
        api.get("/ventas"),
        api.get("/inventario/productos"),
        api.get("/clientes?page=1&limit=100&estado=activos"),
      ]);
      setVentas(vRes.data);
      setProductos(pRes.data.filter(p => p.activo));
      setClientes(cRes.data.data || []);
    } catch (err) {
      showToast(`Error: ${err.response?.data?.error || err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = ventas.filter(v => {
    const matchSearch = !search ||
      (v.folio || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.cliente_nombre || "").toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || v.estado === filtroEstado;
    const matchFecha = !filtroFecha || v.fecha?.startsWith(filtroFecha);
    return matchSearch && matchEstado && matchFecha;
  });

  const totalFiltrado = filtered
    .filter(v => v.estado !== "cancelada")
    .reduce((s, v) => s + Number(v.total || 0), 0);

  const addItem = (prod) => {
    const existe = form.items.find(i => i.producto_id === prod.id);
    if (existe) {
      setForm({
        ...form,
        items: form.items.map(i =>
          i.producto_id === prod.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
            : i
        ),
      });
    } else {
      setForm({
        ...form,
        items: [...form.items, {
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: 1,
          precio: Number(prod.precio_venta) || 0,
          subtotal: Number(prod.precio_venta) || 0,
        }],
      });
    }
  };

  const removeItem = (id) =>
    setForm({ ...form, items: form.items.filter(i => i.producto_id !== id) });

  const updateCantidad = (id, cant) => {
    if (cant < 1) return;
    setForm({
      ...form,
      items: form.items.map(i =>
        i.producto_id === id
          ? { ...i, cantidad: cant, subtotal: cant * i.precio }
          : i
      ),
    });
  };

  const subtotal = form.items.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - (Number(form.descuento) || 0));

  const guardarVenta = async () => {
    if (form.items.length === 0) { showToast("Agrega al menos un producto", "error"); return; }
    if (form.metodo_pago === "credito" && !form.cliente_id) {
      showToast("Selecciona un cliente para ventas a crédito", "error"); return;
    }
    try {
      setSaving(true);
      await api.post("/ventas", {
        ...form,
        cliente_id: form.cliente_id || null,
        subtotal,
        total,
        estado: form.metodo_pago === "credito" ? "pendiente" : form.estado,
      });
      showToast("Venta registrada");
      setModal(false);
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;
  const inputCls = "w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <Layout>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <ShoppingCart className="text-blue-600" /> Ventas
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {filtered.length} ventas ·{" "}
              <span className="text-emerald-600 font-medium">{fmt(totalFiltrado)}</span>
            </p>
          </div>
          <button
            onClick={() => { setForm(EMPTY_FORM); setModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition shadow-sm shadow-blue-200"
          >
            <Plus size={15} /> Nueva Venta
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              className="bg-gray-50 border border-gray-200 p-2.5 pl-9 rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Buscar por folio o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date" value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[["todos","Todos"],["pagada","Pagadas"],["pendiente","Pendientes"],["cancelada","Canceladas"]].map(([val, label]) => (
              <button key={val} onClick={() => setFiltroEstado(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                  ${filtroEstado === val ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>
          {filtroFecha && (
            <button onClick={() => setFiltroFecha("")}
              className="text-xs text-gray-400 hover:text-gray-600 transition">
              Limpiar ✕
            </button>
          )}
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando ventas...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay ventas registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Folio</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pago</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Garrafones</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/70 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{v.folio}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{v.cliente_nombre || "Público general"}</td>
                    <td className="px-5 py-3 text-gray-500">{v.fecha?.split("T")[0]}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIPO_VENTA_COLORS[v.tipo_venta] || "bg-gray-100 text-gray-600"}`}>
                        {v.tipo_venta}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{v.metodo_pago}</td>
                    <td className="px-5 py-3 text-center">
                      {Number(v.garrafones_recibidos) > 0 ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-medium">
                          🫙 {v.garrafones_recibidos}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-800">{fmt(v.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[v.estado] || ""}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => setDetailModal(v)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL NUEVA VENTA */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">

              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg">Nueva Venta</h3>
                <button onClick={() => setModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">

                {/* Fecha + Tipo + Cliente + Pago */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</label>
                    <input type="date" value={form.fecha}
                      onChange={e => setForm({ ...form, fecha: e.target.value })}
                      className={inputCls + " mt-1"} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de Venta</label>
                    <select value={form.tipo_venta}
                      onChange={e => setForm({ ...form, tipo_venta: e.target.value })}
                      className={inputCls + " mt-1"}>
                      <option value="mostrador">Mostrador</option>
                      <option value="ruta">Ruta</option>
                      <option value="pedido">Pedido</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</label>
                    <select value={form.cliente_id}
                      onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                      className={inputCls + " mt-1"}>
                      <option value="">Público general</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Método de Pago</label>
                    <select value={form.metodo_pago}
                      onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                      className={inputCls + " mt-1"}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar Productos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-44 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                    {productos.map(p => (
                      <button key={p.id} onClick={() => addItem(p)}
                        className="text-left p-2.5 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-blue-100 transition-all">
                        <p className="text-xs font-semibold text-gray-700 truncate">{p.nombre}</p>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">Q {Number(p.precio_venta).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Stock: {p.stock_actual}</p>
                      </button>
                    ))}
                    {productos.length === 0 && (
                      <p className="col-span-3 text-center py-4 text-gray-400 text-xs">No hay productos disponibles</p>
                    )}
                  </div>
                </div>

                {/* Carrito */}
                {form.items.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Producto</th>
                          <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Cant.</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Precio</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Subtotal</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {form.items.map(item => (
                          <tr key={item.producto_id}>
                            <td className="px-3 py-2 font-medium text-gray-700">{item.nombre}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => updateCantidad(item.producto_id, item.cantidad - 1)}
                                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                                  <ArrowDown size={10} />
                                </button>
                                <span className="w-8 text-center font-semibold text-sm">{item.cantidad}</span>
                                <button onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)}
                                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                                  <ArrowUp size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500 text-xs">Q {item.precio.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">Q {item.subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => removeItem(item.producto_id)}
                                className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totales */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Descuento</span>
                    <input type="number" min="0" value={form.descuento}
                      onChange={e => setForm({ ...form, descuento: parseFloat(e.target.value) || 0 })}
                      className="w-28 text-right border border-gray-200 bg-white rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2.5">
                    <span>Total</span>
                    <span className="text-emerald-600 text-lg">{fmt(total)}</span>
                  </div>
                </div>

                {/* Garrafones + Estado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      🫙 Garrafones Recibidos
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setForm({ ...form, garrafones_recibidos: Math.max(0, form.garrafones_recibidos - 1) })}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition font-bold text-gray-600">
                        −
                      </button>
                      <input
                        type="number" min="0"
                        value={form.garrafones_recibidos}
                        onChange={e => setForm({ ...form, garrafones_recibidos: parseInt(e.target.value) || 0 })}
                        className="flex-1 text-center border border-gray-200 bg-gray-50 rounded-xl py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setForm({ ...form, garrafones_recibidos: form.garrafones_recibidos + 1 })}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition font-bold text-gray-600">
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</label>
                    <select value={form.estado}
                      onChange={e => setForm({ ...form, estado: e.target.value })}
                      className={inputCls + " mt-1"}
                      disabled={form.metodo_pago === "credito"}>
                      <option value="pagada">Pagada</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                    {form.metodo_pago === "credito" && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Crédito → se marca pendiente automáticamente</p>
                    )}
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</label>
                  <input value={form.notas}
                    onChange={e => setForm({ ...form, notas: e.target.value })}
                    placeholder="Notas opcionales..."
                    className={inputCls + " mt-1"} />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-100 transition">
                  Cancelar
                </button>
                <button onClick={guardarVenta} disabled={saving || form.items.length === 0}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? "Guardando..." : `Registrar Venta · ${fmt(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALLE */}
        {detailModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Detalle de Venta</h3>
                <button onClick={() => setDetailModal(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Folio", <span className="font-mono font-medium">{detailModal.folio}</span>],
                    ["Fecha", detailModal.fecha?.split("T")[0]],
                    ["Cliente", detailModal.cliente_nombre || "Público general"],
                    ["Tipo", detailModal.tipo_venta],
                    ["Pago", detailModal.metodo_pago],
                    ["Estado", <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[detailModal.estado]}`}>{detailModal.estado}</span>],
                  ].map(([label, val], i) => (
                    <div key={i}>
                      <span className="text-gray-400 text-xs">{label}</span>
                      <div className="font-medium text-gray-800 capitalize mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Garrafones en detalle */}
                {Number(detailModal.garrafones_recibidos) > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl">🫙</span>
                    <div>
                      <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Garrafones recibidos</p>
                      <p className="text-xl font-bold text-blue-700">{detailModal.garrafones_recibidos}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>{fmt(detailModal.subtotal)}</span>
                  </div>
                  {Number(detailModal.descuento) > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Descuento</span><span>- {fmt(detailModal.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-emerald-600">{fmt(detailModal.total)}</span>
                  </div>
                </div>

                {detailModal.notas && (
                  <p className="text-xs text-gray-400 italic bg-gray-50 rounded-lg p-3">
                    {detailModal.notas}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Ventas;