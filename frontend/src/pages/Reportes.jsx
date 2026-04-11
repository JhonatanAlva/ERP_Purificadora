import Layout from "../components/Layout";
import { useState } from "react";
import { BarChart3 } from "lucide-react";

const Reportes = () => {
  // datos simulados
  const [ventas] = useState([
    { fecha: "2026-04-01", total: 500 },
    { fecha: "2026-04-02", total: 800 },
    { fecha: "2026-04-03", total: 300 }
  ]);

  const total = ventas.reduce((sum, v) => sum + v.total, 0);
  const promedio = total / ventas.length;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        Reportes
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Total Ventas</p>
          <p className="text-xl font-bold text-green-600">Q {total}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Número de ventas</p>
          <p className="text-xl font-bold text-blue-600">{ventas.length}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Promedio</p>
          <p className="text-xl font-bold text-purple-600">
            Q {promedio.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Fecha</th>
            <th className="p-2">Total</th>
          </tr>
        </thead>

        <tbody>
          {ventas.map((v, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{v.fecha}</td>
              <td className="p-2 text-center">Q {v.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Reportes;