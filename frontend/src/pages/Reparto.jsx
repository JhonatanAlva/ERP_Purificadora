import Layout from "../components/Layout";
import { useState } from "react";
import { Truck, Plus } from "lucide-react";

const Reparto = () => {
  const [rutas, setRutas] = useState([]);

  const [form, setForm] = useState({
    piloto: "",
    camion: "",
    garrafones: 0
  });

  const registrarSalida = () => {
    if (!form.piloto || !form.camion) return;

    const nuevaRuta = {
      id: Date.now(),
      ...form,
      estado: "en ruta",
      vendidos: 0,
      efectivo: 0
    };

    setRutas([...rutas, nuevaRuta]);
    setForm({ piloto: "", camion: "", garrafones: 0 });
  };

  const registrarRegreso = (id) => {
    const vendidos = prompt("¿Cuántos garrafones vendió?");
    const efectivo = prompt("¿Cuánto dinero entregó?");

    setRutas(
      rutas.map((r) =>
        r.id === id
          ? {
              ...r,
              vendidos: Number(vendidos),
              efectivo: Number(efectivo),
              estado: "completado"
            }
          : r
      )
    );
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Truck className="w-6 h-6 text-blue-600" />
        Reparto
      </h1>

      {/* Formulario salida */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <input
          placeholder="Piloto"
          value={form.piloto}
          onChange={(e) =>
            setForm({ ...form, piloto: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          placeholder="Camión"
          value={form.camion}
          onChange={(e) =>
            setForm({ ...form, camion: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Garrafones"
          value={form.garrafones}
          onChange={(e) =>
            setForm({ ...form, garrafones: e.target.value })
          }
          className="border p-2 rounded"
        />

        <button
          onClick={registrarSalida}
          className="bg-blue-600 text-white rounded flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Salida
        </button>
      </div>

      {/* Tabla */}
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Piloto</th>
            <th className="p-2">Camión</th>
            <th className="p-2">Salida</th>
            <th className="p-2">Vendidos</th>
            <th className="p-2">Efectivo</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rutas.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.piloto}</td>
              <td className="p-2">{r.camion}</td>
              <td className="p-2 text-center">{r.garrafones}</td>
              <td className="p-2 text-center">{r.vendidos}</td>
              <td className="p-2 text-center">Q {r.efectivo}</td>
              <td className="p-2 text-center font-semibold">
                {r.estado}
              </td>
              <td className="p-2 text-center">
                {r.estado === "en ruta" && (
                  <button
                    onClick={() => registrarRegreso(r.id)}
                    className="text-green-600"
                  >
                    Registrar regreso
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Reparto;