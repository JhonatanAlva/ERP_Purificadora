import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import {
  TrendingUp,
  Users,
  Package,
  Truck,
  AlertTriangle,
  DollarSign,
  Droplets,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  ShoppingBag,
  CheckCircle,
  BarChart2,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fmt = (n) =>
  `Q ${(parseFloat(n) || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const hoy = () => new Date().toISOString().split("T")[0];
const primerDiaMes = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

const ESTADO_VENTA = {
  pagada: "bg-emerald-50 text-emerald-700",
  pendiente: "bg-amber-50 text-amber-700",
  cancelada: "bg-red-50 text-red-600",
};
const TIPO_VENTA = {
  mostrador: "bg-blue-100 text-blue-700",
  ruta: "bg-orange-100 text-orange-700",
  pedido: "bg-purple-100 text-purple-700",
};

const KPICard = ({ title, value, subtitle, icon, color, bg, to }) => {
  const Icon = icon;
  const inner = (
    <div
      className={`${bg} rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </p>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} border border-gray-200 group-hover:scale-110 transition-transform`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-sky-600 font-bold">{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const nombreUsuario = user?.nombre || "Admin";

  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [ventasDia, setVentasDia] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);
  const [alertasStock, setAlertasStock] = useState([]);
  const [statsReparto, setStatsReparto] = useState(null);
  const [statsCreditos, setStatsCreditos] = useState(null);
  const [totalClientes, setTotalClientes] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    const fi = primerDiaMes();
    const ff = hoy();

    const [res, vd, ventas, stock, rep, cred, cli] = await Promise.allSettled([
      api.get(`/reportes/resumen?fecha_inicio=${fi}&fecha_fin=${ff}`),
      api.get(`/reportes/ventas-dia?fecha_inicio=${fi}&fecha_fin=${ff}`),
      api.get("/ventas"),
      api.get("/reportes/stock"),
      api.get("/reparto/estadisticas"),
      api.get("/creditos/estadisticas"),
      api.get("/clientes"),
    ]);

    if (res.status === "fulfilled") {
      const d = res.value.data;
      setResumen(d?.data ?? d ?? null);
    }
    if (vd.status === "fulfilled") setVentasDia(vd.value.data?.data || []);
    if (ventas.status === "fulfilled") {
      const arr = Array.isArray(ventas.value.data)
        ? ventas.value.data
        : ventas.value.data?.data || [];
      setUltimasVentas(arr.slice(0, 6));
    }
    if (stock.status === "fulfilled") {
      const arr = stock.value.data?.data || [];
      setAlertasStock(arr.filter((p) => p.alerta));
    }
    if (rep.status === "fulfilled") {
      const d = rep.value.data;
      setStatsReparto(d?.data ?? d ?? null);
    }
    if (cred.status === "fulfilled") {
      const d = cred.value.data;
      setStatsCreditos(d?.data ?? d ?? null);
    }
    if (cli.status === "fulfilled") {
      const d = cli.value.data;
      const arr = Array.isArray(d) ? d : d?.data || [];
      setTotalClientes(arr.filter((c) => c.activo).length);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => cargar(), 0);
    return () => clearTimeout(id);
  }, [cargar]);

  const fecha = new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Layout>
      <div className="space-y-6 p-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-500" />
              Dashboard Purificadora El Glaciar
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              Bienvenido,{" "}
              <span className="font-semibold text-gray-700">
                {nombreUsuario}
              </span>
              {" · "}
              {fecha}
            </p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-sm">Cargando dashboard...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard
                title="Ventas Hoy"
                value={fmt(resumen?.ventas?.total_ventas ?? 0)}
                subtitle={`${resumen?.ventas?.num_ventas ?? 0} ventas`}
                icon={DollarSign}
                color="text-emerald-600"
                bg="bg-white"
                to="/ventas"
              />
              <KPICard
                title="Ticket Prom."
                value={fmt(resumen?.ventas?.ticket_promedio ?? 0)}
                subtitle="Este mes"
                icon={TrendingUp}
                color="text-sky-600"
                bg="bg-white"
                to="/reportes"
              />
              <KPICard
                title="Clientes"
                value={totalClientes}
                subtitle="Activos"
                icon={Users}
                color="text-violet-600"
                bg="bg-white"
                to="/clientes"
              />
              <KPICard
                title="Garrafones"
                value={
                  resumen?.reparto?.garrafones_salida ??
                  statsReparto?.total_garrafones ??
                  0
                }
                subtitle="Salieron este mes"
                icon={Package}
                color="text-blue-600"
                bg="bg-white"
                to="/inventario"
              />
              <KPICard
                title="Rutas Activas"
                value={statsReparto?.en_ruta ?? 0}
                subtitle="En camino"
                icon={Truck}
                color="text-orange-500"
                bg="bg-white"
                to="/reparto"
              />
              <KPICard
                title="Cartera"
                value={fmt(statsCreditos?.saldo_pendiente ?? 0)}
                subtitle="Saldo pendiente"
                icon={Wallet}
                color="text-amber-600"
                bg="bg-white"
                to="/creditos"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-sky-500" />
                    Ventas por Día — Mes Actual
                  </h2>
                  <Link
                    to="/reportes"
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                  >
                    Ver reportes <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                {ventasDia.length === 0 ? (
                  <div className="flex items-center justify-center py-14 text-gray-300">
                    <p className="text-sm">Sin ventas registradas este mes</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart
                      data={ventasDia}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                        width={42}
                      />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar
                        dataKey="total"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Alertas de Stock
                  </h2>
                  {alertasStock.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {alertasStock.length}
                    </span>
                  )}
                </div>
                {alertasStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-300 mb-2" />
                    <p className="text-sm text-gray-400">
                      Stock en niveles normales
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {alertasStock.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[130px]">
                            {p.nombre}
                          </p>
                          <p className="text-xs text-amber-600">
                            Mín: {p.stock_minimo}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-red-600">
                          {p.stock_actual}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {statsReparto && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                    <div className="bg-sky-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Rutas cerradas</p>
                      <p className="text-lg font-bold text-sky-600">
                        {statsReparto.cerradas ?? 0}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Efectivo rep.</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {fmt(statsReparto.efectivo_total ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {resumen && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total ventas mes",
                    value: fmt(resumen.ventas?.total_ventas),
                    color: "text-emerald-600",
                    bg: "bg-emerald-50/60",
                  },
                  {
                    label: "Gasto en compras",
                    value: fmt(resumen.compras?.gasto_compras),
                    color: "text-red-600",
                    bg: "bg-red-50/60",
                  },
                  {
                    label: "Utilidad estimada",
                    value: fmt(resumen.utilidad_estimada),
                    color:
                      resumen.utilidad_estimada >= 0
                        ? "text-emerald-700"
                        : "text-red-600",
                    bg:
                      resumen.utilidad_estimada >= 0
                        ? "bg-emerald-50/60"
                        : "bg-red-50/60",
                  },
                  {
                    label: "Cobrado creditos",
                    value: fmt(resumen.creditos?.cobrado_total),
                    color: "text-sky-600",
                    bg: "bg-sky-50/60",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`${s.bg} rounded-xl border border-gray-100 p-4`}
                  >
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                  Ultimas Ventas
                </h2>
                <Link
                  to="/ventas"
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                >
                  Ver todas <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {ultimasVentas.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No hay ventas registradas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {[
                          "Folio",
                          "Cliente",
                          "Fecha",
                          "Tipo",
                          "Total",
                          "Estado",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${h === "Total" ? "text-right" : h === "Estado" ? "text-center" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ultimasVentas.map((v) => (
                        <tr
                          key={v.id}
                          className={`hover:bg-gray-50 transition-colors ${v.estado === "cancelada" ? "opacity-50" : ""}`}
                        >
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">
                            {v.folio}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {v.cliente_nombre || "Publico general"}
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {v.fecha}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_VENTA[v.tipo_venta] || "bg-gray-100 text-gray-600"}`}
                            >
                              {v.tipo_venta}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-800">
                            {fmt(v.total)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_VENTA[v.estado] || ""}`}
                            >
                              {v.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
