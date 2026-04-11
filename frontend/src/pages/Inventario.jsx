import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import api from "../services/api";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
} from "lucide-react";

// ================= TOAST
const Toast = ({ msg, type }) => (
  <div
    className={`fixed top-5 right-5 px-4 py-2 rounded-xl text-white shadow-lg z-50
    ${type === "error" ? "bg-red-500" : "bg-green-500"}`}
  >
    {msg}
  </div>
);

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

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tab, setTab] = useState("productos");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_PROD);
  const [editId, setEditId] = useState(null);

  const [ajusteModal, setAjusteModal] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    producto_id: "",
    cantidad: 0,
    tipo_movimiento: "entrada",
    motivo: "",
  });

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const alertas = productos.filter(
    (p) => p.stock_actual <= p.stock_minimo && p.activo !== false,
  );

  // ================= CRUD
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
    } catch {
      showToast("Error al guardar", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;

    try {
      await api.delete(`/inventario/productos/${id}`);
      showToast("Producto eliminado");
      loadData();
    } catch {
      showToast("Error al eliminar", "error");
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

  return (
    <Layout>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="text-blue-600" /> Inventario
            </h1>
            <p className="text-sm text-gray-500">
              {productos.length} productos · {alertas.length} alertas de stock
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAjusteModal(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-gray-50"
            >
              <RefreshCw size={16} /> Ajustar Stock
            </button>

            <button
              onClick={() => {
                setForm(EMPTY_PROD);
                setEditId(null);
                setModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              <Plus size={16} /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-700 font-medium">
              <AlertTriangle size={18} /> Productos con stock bajo
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {alertas.map((p) => (
                <span
                  key={p.id}
                  className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {p.nombre}: {p.stock_actual} / min {p.stock_minimo}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("productos")}
            className={`px-4 py-2 rounded-xl transition ${
              tab === "productos"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Productos
          </button>

          <button
            onClick={() => setTab("movimientos")}
            className={`px-4 py-2 rounded-xl transition ${
              tab === "movimientos"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Movimientos
          </button>
        </div>

        {/* BUSCAR */}
        {tab === "productos" && (
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              className="bg-gray-100 p-2 pl-10 rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* PRODUCTOS */}
        {tab === "productos" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-center">Precio</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-center">Mínimo</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{p.nombre}</div>
                      <div className="text-xs text-gray-400">
                        {p.descripcion}
                      </div>
                    </td>

                    <td className="text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        {TIPO_LABELS[p.tipo]}
                      </span>
                    </td>

                    <td className="text-center text-green-600 font-semibold">
                      ${p.precio_venta}
                    </td>

                    <td
                      className={`text-center font-semibold ${
                        p.stock_actual <= p.stock_minimo ? "text-red-500" : ""
                      }`}
                    >
                      {p.stock_actual}
                    </td>

                    <td className="text-center">{p.stock_minimo}</td>

                    <td className="text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                        Activo
                      </span>
                    </td>

                    <td className="flex gap-3 justify-center p-3">
                      <Edit2
                        size={16}
                        className="cursor-pointer text-blue-600"
                        onClick={() => {
                          setForm(p);
                          setEditId(p.id);
                          setModal(true);
                        }}
                      />
                      <Trash2
                        size={16}
                        className="cursor-pointer text-red-500"
                        onClick={() => handleDelete(p.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MOVIMIENTOS */}
        {tab === "movimientos" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Stock Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{m.producto_nombre}</td>
                    <td className="text-center">
                      {m.tipo_movimiento === "entrada" ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs flex items-center justify-center gap-1">
                          <ArrowUp size={14} /> Entrada
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs flex items-center justify-center gap-1">
                          <ArrowDown size={14} /> Salida
                        </span>
                      )}
                    </td>
                    <td className="text-center font-semibold">{m.cantidad}</td>
                    <td className="text-center">{m.stock_nuevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL PRODUCTO */}
        {modal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
            <div className="bg-white w-[520px] rounded-2xl shadow-xl overflow-hidden">
              {/* HEADER */}
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h2 className="font-semibold text-lg">
                  {editId ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <X
                  className="cursor-pointer text-gray-500"
                  onClick={() => setModal(false)}
                />
              </div>

              {/* BODY */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Nombre *
                  </label>
                  <input
                    placeholder="Nombre del producto"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    >
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Unidad</label>
                    <input
                      value={form.unidad}
                      onChange={(e) =>
                        setForm({ ...form, unidad: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">
                      Precio Venta
                    </label>
                    <input
                      type="number"
                      value={form.precio_venta}
                      onChange={(e) =>
                        setForm({ ...form, precio_venta: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">
                      Precio Costo
                    </label>
                    <input
                      type="number"
                      value={form.precio_costo}
                      onChange={(e) =>
                        setForm({ ...form, precio_costo: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      value={form.stock_actual}
                      onChange={(e) =>
                        setForm({ ...form, stock_actual: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      value={form.stock_minimo}
                      onChange={(e) =>
                        setForm({ ...form, stock_minimo: e.target.value })
                      }
                      className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Descripción</label>
                  <input
                    placeholder="Descripción opcional"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex gap-3 p-4 border-t">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 border rounded-xl py-2 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700"
                >
                  {editId ? "Guardar" : "Crear Producto"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AJUSTE */}
        {ajusteModal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
            <div className="bg-white w-[420px] rounded-2xl shadow-xl overflow-hidden">
              {/* HEADER */}
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h2 className="font-semibold text-lg">Ajuste de Stock</h2>
                <X
                  className="cursor-pointer text-gray-500"
                  onClick={() => setAjusteModal(false)}
                />
              </div>

              {/* BODY */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Producto</label>
                  <select
                    onChange={(e) =>
                      setAjusteForm({
                        ...ajusteForm,
                        producto_id: e.target.value,
                      })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                  >
                    <option>Seleccionar producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Tipo de Ajuste
                  </label>
                  <select
                    onChange={(e) =>
                      setAjusteForm({
                        ...ajusteForm,
                        tipo_movimiento: e.target.value,
                      })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                  >
                    <option value="entrada">Agregar al stock (+)</option>
                    <option value="salida">Reducir stock (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Cantidad</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) =>
                      setAjusteForm({
                        ...ajusteForm,
                        cantidad: Number(e.target.value),
                      })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Notas</label>
                  <input
                    placeholder="Motivo del ajuste..."
                    onChange={(e) =>
                      setAjusteForm({ ...ajusteForm, motivo: e.target.value })
                    }
                    className="w-full mt-1 bg-gray-100 p-3 rounded-xl"
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex gap-3 p-4 border-t">
                <button
                  onClick={() => setAjusteModal(false)}
                  className="flex-1 border rounded-xl py-2 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleAjuste}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700"
                >
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
