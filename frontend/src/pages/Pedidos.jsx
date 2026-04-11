import Layout from "../components/Layout";
import { useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([
    {
      id: 1,
      cliente: "Juan Pérez",
      producto: "Garrafón 20L",
      cantidad: 2,
      estado: "pendiente"
    }
  ]);

  const [nuevo, setNuevo] = useState({
    cliente: "",
    producto: "",
    cantidad: 1
  });

  const agregarPedido = () => {
    if (!nuevo.cliente || !nuevo.producto) return;

    const pedido = {
      id: Date.now(),
      ...nuevo,
      estado: "pendiente"
    };

    setPedidos([...pedidos, pedido]);
    setNuevo({ cliente: "", producto: "", cantidad: 1 });
  };

  const eliminarPedido = (id) => {
    setPedidos(pedidos.filter(p => p.id !== id));
  };

  const cambiarEstado = (id) => {
    setPedidos(
      pedidos.map(p =>
        p.id === id
          ? {
              ...p,
              estado:
                p.estado === "pendiente"
                  ? "en proceso"
                  : "entregado"
            }
          : p
      )
    );
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        Pedidos
      </h1>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <input
          placeholder="Cliente"
          value={nuevo.cliente}
          onChange={(e) =>
            setNuevo({ ...nuevo, cliente: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          placeholder="Producto"
          value={nuevo.producto}
          onChange={(e) =>
            setNuevo({ ...nuevo, producto: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          min="1"
          value={nuevo.cantidad}
          onChange={(e) =>
            setNuevo({ ...nuevo, cantidad: e.target.value })
          }
          className="border p-2 rounded"
        />

        <button
          onClick={agregarPedido}
          className="bg-blue-600 text-white rounded flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* Tabla */}
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Cliente</th>
            <th className="p-2">Producto</th>
            <th className="p-2">Cantidad</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.cliente}</td>
              <td className="p-2">{p.producto}</td>
              <td className="p-2 text-center">{p.cantidad}</td>
              <td className="p-2 text-center font-semibold">
                {p.estado}
              </td>
              <td className="p-2 text-center flex justify-center gap-2">
                <button
                  onClick={() => cambiarEstado(p.id)}
                  className="text-blue-500 text-sm"
                >
                  Cambiar estado
                </button>

                <button
                  onClick={() => eliminarPedido(p.id)}
                  className="text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Pedidos;