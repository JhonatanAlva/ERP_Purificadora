import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { Users, Plus, Trash2, X, Pencil, Search, Phone, MapPin, Package, CheckCircle, XCircle } from "lucide-react";
import api from "../services/api";

const TIPO_COLORS = {
  mayorista: "bg-purple-100 text-purple-700",
  menudeo: "bg-blue-100 text-blue-700",
  ruta: "bg-orange-100 text-orange-700",
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [confirmDelete, setConfirmDelete] = useState(null);

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    nombre: "", telefono: "", zona: "", direccion: "",
    tipo: "menudeo", garrafones_prestados: 0, notas: "", activo: true,
  });

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const obtenerClientes = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/clientes?page=${page}&limit=10&estado=${filtroEstado}`);
      setClientes(res.data.data);
      setPaginaActual(res.data.page);
      setTotalPaginas(res.data.totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { obtenerClientes(paginaActual); }, [paginaActual, filtroEstado]);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ nombre: "", telefono: "", zona: "", direccion: "", tipo: "menudeo", garrafones_prestados: 0, notas: "", activo: true });
    setShowModal(true);
  };

  const abrirEditar = (cliente) => { setEditando(cliente.id); setForm(cliente); setShowModal(true); };

  const guardarCliente = async () => {
    if (!form.nombre) return;
    try {
      if (editando) {
        const res = await api.put(`/clientes/${editando}`, form);
        setClientes(clientes.map((c) => (c.id === editando ? res.data : c)));
        mostrarToast("Cliente actualizado");
      } else {
        const res = await api.post("/clientes", form);
        setClientes([res.data, ...clientes]);
        mostrarToast("Cliente creado");
      }
      setShowModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/clientes/${confirmDelete}`);
      setClientes(clientes.map((c) => c.id === confirmDelete ? { ...c, activo: false } : c));
      mostrarToast("Cliente desactivado");
      setConfirmDelete(null);
    } catch (error) { console.error(error); }
  };

  const activarCliente = async (id) => {
    try {
      await api.put(`/clientes/${id}`, { activo: true });
      setClientes(clientes.map((c) => (c.id === id ? { ...c, activo: true } : c)));
      mostrarToast("Cliente activado");
    } catch (error) { console.error(error); }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const matchBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono || "").includes(busqueda) ||
      (c.zona || "").toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  return (
    <Layout>
      <div className="space-y-5">

        {/* TOAST */}
        {toast && (
          <div className="fixed top-5 right-5 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> {toast}
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" /> Clientes
            </h2>
            <p className="text-sm text-gray-500">Página {paginaActual} de {totalPaginas}</p>
          </div>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar por nombre, teléfono, zona..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="todos">Tipo</option>
            <option value="menudeo">Menudeo</option>
            <option value="mayorista">Mayorista</option>
            <option value="ruta">Ruta</option>
          </select>
          <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="todos">Estado</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No se encontraron clientes</p>
              <button onClick={abrirCrear}
                className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50">
                <Plus className="w-4 h-4" /> Agregar cliente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Zona</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Garrafones</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientesFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{c.nombre}</p>
                        {c.direccion && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {c.direccion}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {c.telefono
                          ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</span>
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{c.zona || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[c.tipo] || "bg-gray-100 text-gray-600"}`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-sky-600 font-semibold">
                          <Package className="w-3.5 h-3.5" /> {c.garrafones_prestados || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {c.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Switch activo/inactivo */}
                          <div
                            onClick={() => c.activo ? setConfirmDelete(c.id) : activarCliente(c.id)}
                            className={`w-9 h-5 flex items-center rounded-full cursor-pointer transition-colors ${c.activo ? "bg-emerald-400" : "bg-gray-300"}`}
                          >
                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform ${c.activo ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <button onClick={() => abrirEditar(c)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Desactivar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-1.5">
            <button
              onClick={() => setPaginaActual(paginaActual - 1)}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Anterior
            </button>
            {[...Array(totalPaginas)].map((_, i) => (
              <button key={i} onClick={() => setPaginaActual(i + 1)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${paginaActual === i + 1
                  ? "bg-sky-600 text-white font-medium"
                  : "border border-gray-200 hover:bg-gray-50"}`}>
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPaginaActual(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Crear/Editar ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">
                {editando ? "Editar Cliente" : "Nuevo Cliente"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="555-123-4567"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                  <input value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })}
                    placeholder="Colonia o zona"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Dirección completa"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                    <option value="menudeo">Menudeo</option>
                    <option value="mayorista">Mayorista</option>
                    <option value="ruta">Ruta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garrafones Prestados</label>
                  <input type="number" min="0" value={form.garrafones_prestados}
                    onChange={(e) => setForm({ ...form, garrafones_prestados: Number(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    placeholder="Notas adicionales..." rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="activo_cl" checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className="w-4 h-4 accent-sky-600" />
                  <label htmlFor="activo_cl" className="text-sm font-medium text-gray-700">Cliente activo</label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarCliente} disabled={!form.nombre.trim()}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {editando ? "Actualizar" : "Crear Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Desactivar ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">¿Desactivar cliente?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no elimina el cliente, solo lo desactiva. Puedes reactivarlo después.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarEliminar}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}