import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import api from "../services/api";
import {
  Package, Plus, Search, Edit2, Trash2,
  AlertTriangle, ArrowUp, ArrowDown, RefreshCw, X,
} from "lucide-react";

// ================= TOAST
const Toast = ({ msg, type }) => (
  <div className={`fixed top-5 right-5 px-4 py-3 rounded-xl text-white shadow-xl z-50 flex items-center gap-2 text-sm font-medium
    ${type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
    {type === "error" ? "✕" : "✓"} {msg}
  </div>
);

// ================= MODAL CONFIRMACIÓN
const ConfirmModal = ({ nombre, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div className="bg-white w-[360px] rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-6 text-center space-y-3">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="font-bold text-lg text-gray-800">¿Eliminar producto?</h3>
        <p className="text-sm text-gray-500">
          Se desactivará <span className="font-semibold text-gray-700">"{nombre}"</span> del inventario.
          Puedes reactivarlo después.
        </p>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onCancel}
          className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition font-medium">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm hover:bg-red-600 transition font-medium">
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
);

const EMPTY_PROD = {
  nombre: "", tipo: "garrafon_lleno", descripcion: "",
  precio_venta: 0, precio_costo: 0, stock_actual: 0,
  stock_minimo: 10, unidad: "pieza", activo: true,
};

const TIPO_LABELS = {
  garrafon_lleno: "Garrafón Lleno",
  garrafon_vacio: "Garrafón Vacío",
  botella: "Botella",
  otro: "Otro",
};

const TIPO_COLORS = {
  garrafon_lleno: "bg-blue-100 text-blue-700",
  garrafon_vacio: "bg-sky-100 text-sky-700",
  botella: "bg-violet-100 text-violet-700",
  otro: "bg-gray-100 text-gray-600",
};

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tab, setTab] = useState("productos");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_PROD);
  const [editId, setEditId] = useState(null);

  const [ajusteModal, setAjusteModal] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    producto_id: "", cantidad: 0, tipo_movimiento: "entrada", motivo: "",
  });

  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prods, movs] = await Promise.all([
        api.get("/inventario/productos"),
        api.get("/inventario/movimientos"),
      ]);
      setProductos(prods.data);
      setMovimientos(movs.data);
    } catch {
      showToast("Error cargando datos", "error");
    }
  };

  const filtered = productos
    .filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => {
      if (filtroEstado === "activos") return p.activo;
      if (filtroEstado === "inactivos") return !p.activo;
      return true;
    });

  const alertas = productos.filter(
    (p) => p.stock_actual <= p.stock_minimo && p.activo !== false
  );

  const handleSave = async () => {
    try {
      if (editId) {
        await api.put(`/inventario/productos/${editId}`, form);
        showToast("Producto actualizado");
      } else {
        await api.post("/inventario/productos", form);
        showToast("Producto creado");
      }
      setModal(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Error al guardar", "error");
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({ id, nombre });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/inventario/productos/${confirmModal.id}`);
      showToast("Producto desactivado");
      setConfirmModal(null);
      loadData();
    } catch {
      showToast("Error al eliminar", "error");
      setConfirmModal(null);
    }
  };

  const handleActivar = async (id) => {
    try {
      await api.put(`/inventario/productos/${id}/activar`);
      showToast("Producto reactivado");
      loadData();
    } catch {
      showToast("Error al reactivar", "error");
    }
  };

  const handleAjuste = async () => {
    try {
      await api.post("/inventario/movimientos", ajusteForm);
      showToast("Stock actualizado");
      setAjusteModal(false);
      loadData();
    } catch {
      showToast("Error en ajuste", "error");
    }
  };

  const inputCls = "w-full mt-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition";

  return (
    <Layout>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirmModal && (
        <ConfirmModal
          nombre={confirmModal.nombre}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div className="space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <Package className="text-blue-600" /> Inventario
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {productos.length} productos · {" "}
              <span className={alertas.length > 0 ? "text-amber-500 font-medium" : ""}>
                {alertas.length} alertas de stock
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAjusteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium transition"
            >
              <RefreshCw size={15} /> Ajustar Stock
            </button>
            <button
              onClick={() => { setForm(EMPTY_PROD); setEditId(null); setModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition shadow-sm shadow-blue-200"
            >
              <Plus size={15} /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <AlertTriangle size={16} /> Stock bajo en {alertas.length} producto{alertas.length > 1 ? "s" : ""}
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {alertas.map((p) => (
                <span key={p.id} className="bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                  {p.nombre}: <strong>{p.stock_actual}</strong> / mín {p.stock_minimo}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[["productos", "Productos"], ["movimientos", "Movimientos"]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition
                ${tab === val ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* FILTROS + BUSCAR */}
        {tab === "productos" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                className="bg-white border border-gray-200 p-2.5 pl-9 rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[["todos", "Todos"], ["activos", "Activos"], ["inactivos", "Inactivos"]].map(([val, label]) => (
                <button key={val} onClick={() => setFiltroEstado(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                    ${filtroEstado === val ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TABLA PRODUCTOS */}
        {tab === "productos" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Mínimo</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      No se encontraron productos
                    </td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id} className={`border-t border-gray-50 hover:bg-gray-50/70 transition ${!p.activo ? "opacity-50" : ""}`}>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{p.nombre}</div>
                      {p.descripcion && <div className="text-xs text-gray-400 mt-0.5">{p.descripcion}</div>}
                    </td>
                    <td className="text-center p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIPO_COLORS[p.tipo] || "bg-gray-100 text-gray-600"}`}>
                        {TIPO_LABELS[p.tipo]}
                      </span>
                    </td>
                    <td className="text-center p-4 font-semibold text-emerald-600">
                      Q {Number(p.precio_venta).toFixed(2)}
                    </td>
                    <td className="text-center p-4">
                      <span className={`font-bold text-base ${p.stock_actual <= p.stock_minimo ? "text-red-500" : "text-gray-700"}`}>
                        {p.stock_actual}
                      </span>
                    </td>
                    <td className="text-center p-4 text-gray-400 text-sm">{p.stock_minimo}</td>
                    <td className="text-center p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                        ${p.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end items-center">
                        {!p.activo ? (
                          <button onClick={() => handleActivar(p.id)}
                            className="text-xs text-emerald-600 font-medium hover:underline px-2">
                            Reactivar
                          </button>
                        ) : (
                          <button onClick={() => { setForm(p); setEditId(p.id); setModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition">
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(p.id, p.nombre)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLA MOVIMIENTOS */}
        {tab === "movimientos" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                      No hay movimientos registrados
                    </td>
                  </tr>
                )}
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50/70 transition">
                    <td className="p-4 font-medium text-gray-700">{m.producto_nombre}</td>
                    <td className="text-center p-4">
                      {m.tipo_movimiento === "entrada" ? (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
                          <ArrowUp size={12} /> Entrada
                        </span>
                      ) : (
                        <span className="bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
                          <ArrowDown size={12} /> Salida
                        </span>
                      )}
                    </td>
                    <td className="text-center p-4 font-bold text-gray-700">{m.cantidad}</td>
                    <td className="text-center p-4 text-gray-500">{m.stock_nuevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL PRODUCTO */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-lg text-gray-800">
                  {editId ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <button onClick={() => setModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre *</label>
                  <input placeholder="Nombre del producto" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
                    <select value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                      className={inputCls}>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</label>
                    <input value={form.unidad}
                      onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio Venta</label>
                    <input type="number" value={form.precio_venta}
                      onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio Costo</label>
                    <input type="number" value={form.precio_costo}
                      onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Actual</label>
                    <input type="number" value={form.stock_actual}
                      onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Mínimo</label>
                    <input type="number" value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
                  <input placeholder="Descripción opcional" value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-100 transition">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-200">
                  {editId ? "Guardar cambios" : "Crear Producto"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AJUSTE */}
        {ajusteModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-lg text-gray-800">Ajuste de Stock</h2>
                <button onClick={() => setAjusteModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</label>
                  <select onChange={(e) => setAjusteForm({ ...ajusteForm, producto_id: e.target.value })}
                    className={inputCls}>
                    <option value="">Seleccionar producto...</option>
                    {productos.filter(p => p.activo).map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de Ajuste</label>
                  <select onChange={(e) => setAjusteForm({ ...ajusteForm, tipo_movimiento: e.target.value })}
                    className={inputCls}>
                    <option value="entrada">➕ Agregar al stock</option>
                    <option value="salida">➖ Reducir stock</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</label>
                  <input type="number" placeholder="0"
                    onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: Number(e.target.value) })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</label>
                  <input placeholder="Motivo del ajuste..."
                    onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setAjusteModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-100 transition">
                  Cancelar
                </button>
                <button onClick={handleAjuste}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-200">
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Inventario;