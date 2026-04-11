import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { Users, Plus, Trash2, X, Pencil, Search } from "lucide-react";
import api from "../services/api";

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
    nombre: "",
    telefono: "",
    zona: "",
    direccion: "",
    tipo: "menudeo",
    garrafones_prestados: 0,
    notas: "",
    activo: true,
  });

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 🔹 Obtener clientes
  const obtenerClientes = async (page = 1) => {
    try {
      setLoading(true);

      const res = await api.get(
        `/clientes?page=${page}&limit=10&estado=${filtroEstado}`,
      );

      setClientes(res.data.data);
      setPaginaActual(res.data.page);
      setTotalPaginas(res.data.totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerClientes(paginaActual);
  }, [paginaActual, filtroEstado]);

  const abrirCrear = () => {
    setEditando(null);
    setForm({
      nombre: "",
      telefono: "",
      zona: "",
      direccion: "",
      tipo: "menudeo",
      garrafones_prestados: 0,
      notas: "",
      activo: true,
    });
    setShowModal(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente.id);
    setForm(cliente);
    setShowModal(true);
  };

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

  const pedirEliminar = (id) => {
    setConfirmDelete(id);
  };

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/clientes/${confirmDelete}`);

      setClientes(
        clientes.map((c) =>
          c.id === confirmDelete ? { ...c, activo: false } : c,
        ),
      );

      mostrarToast("Cliente desactivado");
      setConfirmDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  // ACTIVAR
  const activarCliente = async (id) => {
    try {
      await api.put(`/clientes/${id}`, { activo: true });

      setClientes(
        clientes.map((c) => (c.id === id ? { ...c, activo: true } : c)),
      );

      mostrarToast("Cliente activado");
    } catch (error) {
      console.error(error);
    }
  };

  // 🔹 FILTROS
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
      <div className="space-y-6">
        {/* TOAST */}
        {toast && (
          <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded shadow z-50">
            {toast}
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-500" /> Clientes
            </h2>
            <p className="text-gray-500 text-sm">
              Página {paginaActual} de {totalPaginas}
            </p>
          </div>

          <button
            onClick={abrirCrear}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white p-4 rounded-xl shadow flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 border px-3 py-2 rounded w-full">
            <Search size={16} />
            <input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full outline-none"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="todos">Tipo</option>
            <option value="menudeo">Menudeo</option>
            <option value="mayorista">Mayorista</option>
            <option value="ruta">Ruta</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="todos">Estado</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Zona</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Garrafones</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-5">
                    Cargando...
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-semibold">{c.nombre}</div>
                      <div className="text-xs text-gray-500">
                        📍 {c.direccion || "Sin dirección"}
                      </div>
                    </td>

                    <td className="p-4">{c.telefono}</td>
                    <td className="p-4">{c.zona}</td>

                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600">
                        {c.tipo}
                      </span>
                    </td>

                    <td className="p-4 text-center font-bold">
                      {c.garrafones_prestados}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          c.activo
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="p-4 flex justify-center gap-3 items-center">
                      {/* SWITCH */}
                      <div
                        onClick={() =>
                          c.activo ? pedirEliminar(c.id) : activarCliente(c.id)
                        }
                        className={`w-10 h-5 flex items-center rounded-full cursor-pointer ${
                          c.activo ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
                            c.activo ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </div>

                      <button onClick={() => abrirEditar(c)}>
                        <Pencil size={18} />
                      </button>

                      <button onClick={() => pedirEliminar(c.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPaginaActual(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="px-3 py-1 border rounded"
          >
            Anterior
          </button>

          {[...Array(totalPaginas)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPaginaActual(i + 1)}
              className={`px-3 py-1 rounded ${
                paginaActual === i + 1 ? "bg-blue-600 text-white" : "border"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPaginaActual(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1 border rounded"
          >
            Siguiente
          </button>
        </div>

        {/* MODALES MEJORADOS */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-fadeIn">
              {/* CERRAR */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
              >
                <X />
              </button>

              {/* HEADER */}
              <h3 className="text-xl font-bold">
                {editando ? "Editar Cliente" : "Nuevo Cliente"}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {editando
                  ? "Modifica la información del cliente seleccionado."
                  : "Completa los datos para registrar un nuevo cliente en el sistema."}
              </p>

              {/* FORM */}
              <div className="space-y-4">
                {/* NOMBRE */}
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Nombre *
                  </label>
                  <input
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* TEL + ZONA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Teléfono</label>
                    <input
                      value={form.telefono}
                      onChange={(e) =>
                        setForm({ ...form, telefono: e.target.value })
                      }
                      className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Zona</label>
                    <input
                      value={form.zona}
                      onChange={(e) =>
                        setForm({ ...form, zona: e.target.value })
                      }
                      className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* DIRECCIÓN */}
                <div>
                  <label className="text-sm text-gray-600">Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={(e) =>
                      setForm({ ...form, direccion: e.target.value })
                    }
                    className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* TIPO + GARRAFONES */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">
                      Tipo de Cliente
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="menudeo">Menudeo</option>
                      <option value="mayorista">Mayorista</option>
                      <option value="ruta">Ruta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">
                      Garrafones Prestados
                    </label>
                    <input
                      type="number"
                      value={form.garrafones_prestados}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          garrafones_prestados: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* NOTAS */}
                <div>
                  <label className="text-sm text-gray-600">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) =>
                      setForm({ ...form, notas: e.target.value })
                    }
                    className="w-full border mt-1 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                  />
                </div>

                {/* BOTONES */}
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={guardarCliente}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
                  >
                    {editando ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
              <h3 className="text-lg font-bold mb-2">¿Desactivar cliente?</h3>

              <p className="text-gray-500 mb-4">
                Esta acción no elimina el cliente, solo lo desactiva.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmarEliminar}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Sí, desactivar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
