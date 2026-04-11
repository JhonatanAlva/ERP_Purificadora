import Layout from "../components/Layout";
import { useState } from "react";
import {
  Wallet,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Search
} from "lucide-react";

export default function Creditos() {
  // MOCK DATA (solo visual)
  const [creditos] = useState([
    {
      id: 1,
      cliente: "Jhonatan",
      monto_total: 200,
      saldo_actual: 120,
      estado: "pendiente",
    },
    {
      id: 2,
      cliente: "Pedro",
      monto_total: 150,
      saldo_actual: 0,
      estado: "pagado",
    },
    {
      id: 3,
      cliente: "María",
      monto_total: 300,
      saldo_actual: 75,
      estado: "pendiente",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");

  const filtrados = creditos.filter(c =>
    c.cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const total = creditos.reduce((a, c) => a + c.monto_total, 0);
  const pendiente = creditos.reduce((a, c) => a + c.saldo_actual, 0);
  const pagado = total - pendiente;

  return (
    <Layout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            Créditos
          </h2>
          <p className="text-gray-500 text-sm">
            Control de deudas y pagos de clientes
          </p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card
            title="Total otorgado"
            value={`Q ${total}`}
            icon={DollarSign}
            color="text-blue-600"
          />

          <Card
            title="Pendiente"
            value={`Q ${pendiente}`}
            icon={TrendingDown}
            color="text-red-500"
          />

          <Card
            title="Recuperado"
            value={`Q ${pagado}`}
            icon={TrendingUp}
            color="text-green-600"
          />

        </div>

        {/* BUSCADOR */}
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
          <Search size={16} />
          <input
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-center">Monto</th>
                  <th className="p-3 text-center">Saldo</th>
                  <th className="p-3 text-center">Progreso</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((c) => {
                  const porcentaje =
                    ((c.monto_total - c.saldo_actual) / c.monto_total) * 100;

                  return (
                    <tr
                      key={c.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      {/* CLIENTE */}
                      <td className="p-3 font-medium text-gray-800">
                        {c.cliente}
                      </td>

                      {/* MONTO */}
                      <td className="p-3 text-center font-semibold">
                        Q {c.monto_total}
                      </td>

                      {/* SALDO */}
                      <td className="p-3 text-center">
                        <span className="font-bold text-red-500">
                          Q {c.saldo_actual}
                        </span>
                      </td>

                      {/* PROGRESO */}
                      <td className="p-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          {porcentaje.toFixed(0)}%
                        </p>
                      </td>

                      {/* ESTADO */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium
                          ${
                            c.estado === "pagado"
                              ? "bg-green-100 text-green-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

        </div>
      </div>
    </Layout>
  );
}

// 🔹 CARD COMPONENT
function Card({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  );
}