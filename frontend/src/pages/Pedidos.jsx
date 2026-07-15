import Layout from "../components/Layout";
import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import {
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  MapPin,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const Toast = ({ msg, type }) => (
  <div
    className={`fixed top-5 right-5 px-4 py-3 rounded-xl text-white shadow-xl z-50 flex items-center gap-2 text-sm font-medium
    ${type === "error" ? "bg-red-500" : "bg-emerald-500"}`}
  >
    {type === "error" ? "✕" : "✓"} {msg}
  </div>
);

const ConfirmModal = ({ msg, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div className="bg-white w-[360px] rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-6 text-center space-y-3">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="font-bold text-lg text-gray-800">¿Eliminar pedido?</h3>
        <p className="text-sm text-gray-500">{msg}</p>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600 transition"
        >
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
);

const ESTADO_CONFIG = {
  pendiente: {
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Clock,
    label: "Pendiente",
  },
  en_proceso: {
    color: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Truck,
    label: "En Proceso",
  },
  entregado: {
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle,
    label: "Entregado",
  },
  cancelado: {
    color: "bg-red-50 text-red-600 border border-red-200",
    icon: XCircle,
    label: "Cancelado",
  },
};

const EMPTY_FORM = {
  cliente_id: "",
  cliente_nombre: "",
  fecha_pedido: new Date().toISOString().split("T")[0],
  fecha_entrega: "",
  items: [],
  total_estimado: 0,
  estado: "pendiente",
  direccion_entrega: "",
  zona: "",
  notas: "",
};

const inputCls =
  "w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const Pedidos = () => {
  const { user } = useAuth();
  const esAdmin = ["admin", "superadmin"].includes(user?.rol);

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [pedidoOriginal, setPedidoOriginal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  // Para expandir items en cards
  const [expandedId, setExpandedId] = useState(null);
  const [detalles, setDetalles] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // 2. Mover loadData ANTES del useEffect y envolverla en useCallback
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, prodRes] = await Promise.all([
        api.get("/pedidos"),
        api.get("/clientes?page=1&limit=100&estado=activos"),
        api.get("/inventario/productos"),
      ]);
      setPedidos(pRes.data);
      setClientes(cRes.data.data || []);
      setProductos(prodRes.data.filter((p) => p.activo));
    } catch {
      showToast("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadData(), 0);
    return () => clearTimeout(id);
  }, [loadData]);

  const loadDetalle = async (id) => {
    if (detalles[id]) return;
    try {
      const res = await api.get(`/pedidos/${id}`);
      setDetalles((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      setDetalles((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const toggleExpand = (id) => {
    const newId = expandedId === id ? null : id;
    setExpandedId(newId);
    if (newId) loadDetalle(id);
  };

  // ================= FILTROS
  const filtered = pedidos.filter((p) => {
    const matchSearch =
      !search ||
      (p.cliente_nombre || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.zona || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.folio || "").toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || p.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const counts = {
    pendiente: pedidos.filter((p) => p.estado === "pendiente").length,
    en_proceso: pedidos.filter((p) => p.estado === "en_proceso").length,
    entregado: pedidos.filter((p) => p.estado === "entregado").length,
    cancelado: pedidos.filter((p) => p.estado === "cancelado").length,
  };

  // ================= CARRITO
  const addItem = (prod) => {
    const stockDisponible = prod.stock_actual;
    if (stockDisponible <= 0) {
      showToast(`Sin stock disponible para ${prod.nombre}`, "error");
      return;
    }
    const existe = form.items.find((i) => i.producto_id === prod.id);
    if (existe) {
      // No superar stock
      if (existe.cantidad >= stockDisponible) {
        showToast(
          `Stock máximo alcanzado para ${prod.nombre} (${stockDisponible})`,
          "error",
        );
        return;
      }
      const newItems = form.items.map((i) =>
        i.producto_id === prod.id
          ? {
              ...i,
              cantidad: i.cantidad + 1,
              subtotal: (i.cantidad + 1) * i.precio_unitario,
            }
          : i,
      );
      setForm({
        ...form,
        items: newItems,
        total_estimado: newItems.reduce((s, i) => s + i.subtotal, 0),
      });
    } else {
      const newItems = [
        ...form.items,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: 1,
          precio_unitario: Number(prod.precio_venta) || 0,
          subtotal: Number(prod.precio_venta) || 0,
        },
      ];
      setForm({
        ...form,
        items: newItems,
        total_estimado: newItems.reduce((s, i) => s + i.subtotal, 0),
      });
    }
  };

  const removeItem = (id) => {
    const newItems = form.items.filter((i) => i.producto_id !== id);
    setForm({
      ...form,
      items: newItems,
      total_estimado: newItems.reduce((s, i) => s + i.subtotal, 0),
    });
  };

  const updateCantidad = (id, cant) => {
    if (cant < 1) return;
    const newItems = form.items.map((i) =>
      i.producto_id === id
        ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario }
        : i,
    );
    setForm({
      ...form,
      items: newItems,
      total_estimado: newItems.reduce((s, i) => s + i.subtotal, 0),
    });
  };

  // ================= CRUD
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModal(true);
  };

  const openEdit = async (pedido) => {
    //guardar estado original (CLAVE)
    setPedidoOriginal({
      ...pedido,
      estado: pedido.estado?.trim().toLowerCase(),
    });

    setEditId(pedido.id);

    setForm({
      ...pedido,
      estado: pedido.estado?.trim().toLowerCase(), // 🔥 normalizado
      fecha_pedido: pedido.fecha_pedido?.split("T")[0] || "",
      fecha_entrega: pedido.fecha_entrega?.split("T")[0] || "",
      items: [],
      total_estimado: pedido.total_estimado,
    });

    setModal(true);

    try {
      const res = await api.get(`/pedidos/${pedido.id}`);

      const items = res.data.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.producto_nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precio_unitario) || 0,
        subtotal: (Number(item.precio_unitario) || 0) * item.cantidad,
      }));

      setForm((prev) => ({
        ...prev,
        items,
        total_estimado: items.reduce((s, i) => s + i.subtotal, 0),
      }));
    } catch (error) {
      console.error("Error cargando detalle:", error);
    }
  };

  const handleSave = async () => {
    if (!form.cliente_nombre?.trim()) {
      showToast("Selecciona o escribe un cliente", "error");
      return;
    }

    const puedeEditarProductos =
      !editId || ["pendiente", "en_proceso"].includes(form.estado);

    if (puedeEditarProductos && form.items.length === 0) {
      showToast("Agrega al menos un producto", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        cliente_id: form.cliente_id || null,
        cliente_nombre: form.cliente_nombre,
        fecha_pedido: form.fecha_pedido,
        fecha_entrega: form.fecha_entrega || null,
        direccion_entrega: form.direccion_entrega,
        zona: form.zona,
        notas: form.notas,
        items: puedeEditarProductos ? form.items : [],
      };

      if (editId) {
        // 🔥 1. ACTUALIZAR DATOS (SIN ESTADO)
        await api.put(`/pedidos/${editId}`, payload);

        // 🔥 2. CAMBIAR ESTADO SI CAMBIÓ
        if (form.estado !== pedidoOriginal.estado) {
          await api.patch(`/pedidos/${editId}/estado`, {
            estado: form.estado,
          });
        }

        showToast("Pedido actualizado");
      } else {
        await api.post("/pedidos", {
          ...payload,
          estado: form.estado, // solo en create
        });

        showToast("Pedido creado");
      }

      setModal(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/pedidos/${id}/estado`, { estado });
      showToast(`Estado: ${estado.replace("_", " ")}`);
      loadData();
    } catch {
      showToast("Error al cambiar estado", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/pedidos/${confirmDelete.id}`);
      showToast("Pedido eliminado");
      setConfirmDelete(null);
      loadData();
    } catch {
      showToast("Error al eliminar", "error");
      setConfirmDelete(null);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;
  // Dentro del JSX del modal, antes de la sección de productos:
  const puedeEditarProductos =
    !editId || form.estado === "pendiente" || form.estado === "en_proceso";

  return (
    <Layout>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirmDelete && (
        <ConfirmModal
          msg={`Se eliminará el pedido de "${confirmDelete.nombre}".`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <ClipboardList className="text-blue-600" /> Pedidos
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="text-amber-500 font-medium">
                {counts.pendiente} pendientes
              </span>
              {" · "}
              <span className="text-blue-500 font-medium">
                {counts.en_proceso} en proceso
              </span>
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition shadow-sm shadow-blue-200"
          >
            <Plus size={15} /> Nuevo Pedido
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              className="bg-gray-50 border border-gray-200 p-2.5 pl-9 rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Buscar por cliente, zona, folio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
            {[
              ["todos", "Todos"],
              ["pendiente", "Pendientes"],
              ["en_proceso", "En Proceso"],
              ["entregado", "Entregados"],
              ["cancelado", "Cancelados"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltroEstado(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                  ${filtroEstado === val ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* CARDS */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Cargando pedidos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No hay pedidos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((pedido) => {
              const cfg =
                ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.pendiente;
              const Icon = cfg.icon;
              const isExpanded = expandedId === pedido.id;

              return (
                <div
                  key={pedido.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  {/* Cabecera */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        {pedido.cliente_nombre}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {pedido.folio}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
                    >
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 mb-3">
                    {pedido.zona && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} className="text-gray-400" />
                        {pedido.zona}
                      </p>
                    )}
                    {pedido.direccion_entrega && (
                      <p className="text-xs text-gray-400 truncate">
                        {pedido.direccion_entrega}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-gray-400" />
                        {pedido.fecha_pedido?.split("T")[0] ||
                          pedido.fecha_pedido}
                      </span>
                      {pedido.fecha_entrega && (
                        <span className="text-blue-600 font-medium">
                          →{" "}
                          {pedido.fecha_entrega?.split("T")[0] ||
                            pedido.fecha_entrega}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  {Number(pedido.total_estimado) > 0 && (
                    <p className="font-bold text-emerald-600 text-base mb-2">
                      {fmt(pedido.total_estimado)}
                    </p>
                  )}

                  {/* Ver productos — toggle lazy */}
                  <button
                    onClick={() => toggleExpand(pedido.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition mb-2"
                  >
                    {isExpanded ? (
                      <ArrowUp size={11} />
                    ) : (
                      <ArrowDown size={11} />
                    )}
                    {isExpanded ? "Ocultar productos" : "Ver productos"}
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 space-y-0.5">
                      {!detalles[pedido.id] ? (
                        <p className="text-xs text-gray-400 text-center py-1">
                          Cargando...
                        </p>
                      ) : detalles[pedido.id].length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-1">
                          Sin productos
                        </p>
                      ) : (
                        detalles[pedido.id].map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs text-gray-600"
                          >
                            <span>
                              {item.producto_nombre} x{item.cantidad}
                            </span>
                            <span className="font-medium">
                              Q{" "}
                              {(
                                Number(item.precio_unitario) * item.cantidad
                              ).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {pedido.estado === "pendiente" && (
                      <button
                        onClick={() => cambiarEstado(pedido.id, "en_proceso")}
                        className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium transition"
                      >
                        Procesar
                      </button>
                    )}
                    {pedido.estado === "en_proceso" && (
                      <button
                        onClick={() => cambiarEstado(pedido.id, "entregado")}
                        className="flex-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-1.5 rounded-lg font-medium transition"
                      >
                        Marcar Entregado
                      </button>
                    )}
                    {(pedido.estado === "pendiente" ||
                      pedido.estado === "en_proceso") && (
                      <button
                        onClick={() => cambiarEstado(pedido.id, "cancelado")}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        Cancelar
                      </button>
                    )}
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => openEdit(pedido)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      {esAdmin && (
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              id: pedido.id,
                              nombre: pedido.cliente_nombre,
                            })
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notas */}
                  {pedido.notas && (
                    <p className="text-xs text-gray-400 italic mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      {pedido.notas}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL CREAR / EDITAR */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg">
                  {editId ? "Editar Pedido" : "Nuevo Pedido"}
                </h3>
                <button
                  onClick={() => setModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Cliente */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Cliente *
                  </label>
                  <select
                    value={form.cliente_id}
                    onChange={(e) => {
                      const c = clientes.find((x) => x.id === e.target.value);
                      setForm({
                        ...form,
                        cliente_id: e.target.value,
                        cliente_nombre: c?.nombre || "",
                        zona: c?.zona || form.zona,
                        direccion_entrega:
                          c?.direccion || form.direccion_entrega,
                      });
                    }}
                    className={inputCls + " mt-1"}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {!form.cliente_id && (
                    <input
                      placeholder="O escribe el nombre del cliente"
                      value={form.cliente_nombre}
                      onChange={(e) =>
                        setForm({ ...form, cliente_nombre: e.target.value })
                      }
                      className={inputCls + " mt-2"}
                    />
                  )}
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha Pedido
                    </label>
                    <input
                      type="date"
                      value={form.fecha_pedido}
                      onChange={(e) =>
                        setForm({ ...form, fecha_pedido: e.target.value })
                      }
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha Entrega
                    </label>
                    <input
                      type="date"
                      value={form.fecha_entrega}
                      onChange={(e) =>
                        setForm({ ...form, fecha_entrega: e.target.value })
                      }
                      className={inputCls + " mt-1"}
                    />
                  </div>
                </div>

                {/* Zona + Estado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Zona
                    </label>
                    <input
                      value={form.zona}
                      onChange={(e) =>
                        setForm({ ...form, zona: e.target.value })
                      }
                      placeholder="Zona de entrega"
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Estado
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value })
                      }
                      className={inputCls + " mt-1"}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Dirección de Entrega
                  </label>
                  <input
                    value={form.direccion_entrega}
                    onChange={(e) =>
                      setForm({ ...form, direccion_entrega: e.target.value })
                    }
                    placeholder="Dirección completa"
                    className={inputCls + " mt-1"}
                  />
                </div>

                {/* Productos — solo editables en pendiente/en_proceso */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Productos
                    {!puedeEditarProductos && (
                      <span className="ml-2 text-amber-500 normal-case font-normal">
                        — no editable en estado "{form.estado}"
                      </span>
                    )}
                  </label>

                  {puedeEditarProductos ? (
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                      {productos.map((prod) => (
                        <button
                          key={prod.id}
                          onClick={() => addItem(prod)}
                          disabled={prod.stock_actual <= 0}
                          className={`text-left p-2.5 rounded-xl border transition-all
            ${
              prod.stock_actual <= 0
                ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50"
                : "hover:bg-white hover:shadow-sm border-transparent hover:border-blue-100"
            }`}
                        >
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {prod.nombre}
                          </p>
                          <p className="text-xs text-emerald-600 font-bold mt-0.5">
                            Q {Number(prod.precio_venta).toFixed(2)}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${prod.stock_actual <= 0 ? "text-red-400 font-medium" : "text-gray-400"}`}
                          >
                            {prod.stock_actual <= 0
                              ? "Sin stock"
                              : `Stock: ${prod.stock_actual}`}
                          </p>
                        </button>
                      ))}
                      {productos.length === 0 && (
                        <p className="col-span-2 text-center py-3 text-gray-400 text-xs">
                          Sin productos disponibles
                        </p>
                      )}
                    </div>
                  ) : (
                    // Solo muestra los productos sin poder editar
                    <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                      {form.items.length === 0 ? (
                        <p className="text-center py-3 text-gray-400 text-xs">
                          Sin productos
                        </p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                                Producto
                              </th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                                Cant.
                              </th>
                              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {form.items.map((item) => (
                              <tr key={item.producto_id}>
                                <td className="px-3 py-2 font-medium text-gray-700 text-xs">
                                  {item.nombre}
                                </td>
                                <td className="px-3 py-2 text-center text-xs font-semibold">
                                  {item.cantidad}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-xs text-gray-800">
                                  Q {item.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-100">
                              <td
                                colSpan={2}
                                className="px-3 py-2 text-xs font-semibold text-gray-500"
                              >
                                Total estimado
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-bold text-emerald-600">
                                {fmt(form.total_estimado)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* Carrito editable — solo cuando puede editar productos */}
                {puedeEditarProductos && form.items.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                            Producto
                          </th>
                          <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                            Cant.
                          </th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">
                            Subtotal
                          </th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {form.items.map((item) => (
                          <tr key={item.producto_id}>
                            <td className="px-3 py-2 font-medium text-gray-700 text-xs">
                              {item.nombre}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    updateCantidad(
                                      item.producto_id,
                                      item.cantidad - 1,
                                    )
                                  }
                                  className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                >
                                  <ArrowDown size={9} />
                                </button>
                                <span className="w-6 text-center text-xs font-semibold">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCantidad(
                                      item.producto_id,
                                      item.cantidad + 1,
                                    )
                                  }
                                  disabled={
                                    item.cantidad >=
                                    (productos.find(
                                      (p) => p.id === item.producto_id,
                                    )?.stock_actual ?? 0)
                                  }
                                  className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ArrowUp size={9} />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-xs text-gray-800">
                              Q {item.subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => removeItem(item.producto_id)}
                                className="p-1 rounded hover:bg-red-50 text-red-400 transition"
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                      <span className="text-xs font-semibold text-gray-500">
                        Total estimado
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        {fmt(form.total_estimado)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Notas
                  </label>
                  <textarea
                    value={form.notas}
                    onChange={(e) =>
                      setForm({ ...form, notas: e.target.value })
                    }
                    placeholder="Instrucciones especiales..."
                    rows={2}
                    className={inputCls + " mt-1 resize-none"}
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Guardando..."
                    : editId
                      ? "Actualizar Pedido"
                      : "Crear Pedido"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Pedidos;
