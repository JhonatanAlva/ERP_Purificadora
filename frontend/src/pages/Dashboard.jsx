import Layout from "../components/Layout";
import { useState } from "react";
import { DollarSign, Users, Package, Truck } from "lucide-react";

const Card = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-xl shadow border flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
    <Icon className={`w-8 h-8 ${color}`} />
  </div>
);

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [data] = useState({
    ventasHoy: 1250,
    clientes: 25,
    inventario: 300,
    repartos: 5
  });

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-blue-600 mb-2">
        Dashboard Purificadora El Glaciar
      </h1>

      <p className="text-gray-600 mb-6">
        Bienvenido, <span className="font-semibold">{user?.nombre}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Ventas Hoy" value={`Q ${data.ventasHoy}`} icon={DollarSign} color="text-green-600" />
        <Card title="Clientes" value={data.clientes} icon={Users} color="text-blue-600" />
        <Card title="Inventario" value={data.inventario} icon={Package} color="text-purple-600" />
        <Card title="Repartos Activos" value={data.repartos} icon={Truck} color="text-orange-500" />
      </div>
    </Layout>
  );
};

export default Dashboard;