import Layout from "../components/Layout";
import { useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([
    { id: 1, nombre: "Proveedor Agua S.A", telefono: "555-1234" }
  ]);

  const [nuevo, setNuevo] = useState({
    nombre: "",
    telefono: ""
  });

  const agregarProveedor = () => {
    if (!nuevo.nombre) return;

    const proveedor = {
      id: Date.now(),
      ...nuevo
    };

    setProveedores([...proveedores, proveedor]);
    setNuevo({ nombre: "", telefono: "" });
  };

  const eliminarProveedor = (id) => {
    setProveedores(proveedores.filter(p => p.id !== id));
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-blue-600" />
        Proveedores
      </h1>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          placeholder="Nombre proveedor"
          value={nuevo.nombre}
          onChange={(e) =>
            setNuevo({ ...nuevo, nombre: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          placeholder="Teléfono"
          value={nuevo.telefono}
          onChange={(e) =>
            setNuevo({ ...nuevo, telefono: e.target.value })
          }
          className="border p-2 rounded"
        />

        <button
          onClick={agregarProveedor}
          className="bg-blue-600 text-white rounded flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* Tabla */}
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Nombre</th>
            <th className="p-2">Teléfono</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.nombre}</td>
              <td className="p-2">{p.telefono}</td>
              <td className="p-2 text-center">
                <button
                  onClick={() => eliminarProveedor(p.id)}
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

export default Proveedores;