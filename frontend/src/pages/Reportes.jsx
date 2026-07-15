import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  BarChart2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Truck,
  Package,
  Wallet,
  ShoppingBag,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `Q ${(parseFloat(n) || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const hoy = () => new Date().toISOString().split("T")[0];
const primerDiaMes = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ─── Componentes pequeños ─────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon: Icon, color, bg }) => (
  <div className={`${bg} rounded-xl border border-gray-100 shadow-sm p-4`}>
    <div className="flex items-start justify-between mb-2">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <Icon className={`w-4 h-4 ${color} opacity-70`} />
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active
        ? "bg-white shadow-sm text-sky-600 border border-gray-200"
        : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
    }`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

const TooltipVentas = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Component principal ──────────────────────────────────────────────────────

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
  const [fechaFin, setFechaFin] = useState(hoy());
  const [tab, setTab] = useState("ventas");

  const [resumen, setResumen] = useState(null);
  const [ventasDia, setVentasDia] = useState([]);
  const [ventasMes, setVentasMes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [repartoDia, setRepartoDia] = useState([]);
  const [stock, setStock] = useState([]);
  const [abonosDia, setAbonosDia] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = `fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, vd, vm, pv, dv, rd, st, ab] = await Promise.all([
        api.get(`/reportes/resumen?${params}`),
        api.get(`/reportes/ventas-dia?${params}`),
        api.get(`/reportes/ventas-mes`),
        api.get(`/reportes/productos-vendidos?${params}`),
        api.get(`/reportes/detalle-ventas?${params}`),
        api.get(`/reportes/reparto-dia?${params}`),
        api.get(`/reportes/stock`),
        api.get(`/reportes/abonos-dia?${params}`),
      ]);
      setResumen(res.data.data);
      setVentasDia(vd.data.data || []);
      // Normalizar meses para el gráfico anual (12 meses fijos)
      const mesMap = {};
      (vm.data.data || []).forEach((m) => {
        mesMap[m.mes] = parseFloat(m.total);
      });
      setVentasMes(
        MESES.map((nombre, i) => ({ mes: nombre, total: mesMap[i + 1] || 0 })),
      );
      setProductos(pv.data.data || []);
      setDetalle(dv.data.data || []);
      setRepartoDia(rd.data.data || []);
      setStock(st.data.data || []);
      setAbonosDia(ab.data.data || []);
    } catch {
      setError("Error al cargar los reportes. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const setAtajo = (tipo) => {
    const hoyStr = hoy();
    if (tipo === "hoy") {
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
    }
    if (tipo === "mes") {
      setFechaInicio(primerDiaMes());
      setFechaFin(hoyStr);
    }
    if (tipo === "anio") {
      const anio = new Date().getFullYear();
      setFechaInicio(`${anio}-01-01`);
      setFechaFin(hoyStr);
    }
  };

  const alertasStock = stock.filter((p) => p.alerta);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-5 p-1">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-sky-500" /> Reportes
            </h1>
            <p className="text-sm text-gray-500">
              Análisis y estadísticas del negocio
            </p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Actualizar
          </button>
        </div>

        {/* Selector de fechas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 font-medium">Período:</span>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <div className="flex gap-2 ml-auto">
            {[
              ["hoy", "Hoy"],
              ["mes", "Este mes"],
              ["anio", "Este año"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setAtajo(k)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando reportes...
          </div>
        ) : (
          resumen && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Total Ventas"
                  value={fmt(resumen.ventas.total_ventas)}
                  sub={`${resumen.ventas.num_ventas} ventas`}
                  icon={TrendingUp}
                  color="text-emerald-600"
                  bg="bg-emerald-50/50"
                />
                <StatCard
                  label="Nº Ventas"
                  value={resumen.ventas.num_ventas}
                  sub={`Ticket: ${fmt(resumen.ventas.ticket_promedio)}`}
                  icon={BarChart2}
                  color="text-sky-600"
                  bg="bg-sky-50/50"
                />
                <StatCard
                  label="Rutas Cerradas"
                  value={resumen.reparto.rutas_cerradas}
                  sub={`${resumen.reparto.garrafones_salida} garrafones`}
                  icon={Truck}
                  color="text-violet-600"
                  bg="bg-violet-50/50"
                />
                <StatCard
                  label="Efectivo Reparto"
                  value={fmt(resumen.reparto.efectivo_reparto)}
                  sub={`Compras: ${fmt(resumen.compras.gasto_compras)}`}
                  icon={ShoppingBag}
                  color="text-amber-600"
                  bg="bg-amber-50/50"
                />
              </div>

              {/* Segunda fila KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Cartera pendiente"
                  value={fmt(resumen.creditos.cartera_pendiente)}
                  icon={Wallet}
                  color="text-red-500"
                  bg="bg-red-50/50"
                />
                <StatCard
                  label="Cobrado (créditos)"
                  value={fmt(resumen.creditos.cobrado_total)}
                  icon={TrendingUp}
                  color="text-teal-600"
                  bg="bg-teal-50/50"
                />
                <StatCard
                  label="Utilidad estimada"
                  value={fmt(resumen.utilidad_estimada)}
                  sub="Ventas − Compras"
                  icon={TrendingUp}
                  color={
                    resumen.utilidad_estimada >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                  bg={
                    resumen.utilidad_estimada >= 0
                      ? "bg-emerald-50/50"
                      : "bg-red-50/50"
                  }
                />
              </div>

              {/* Alerta stock */}
              {alertasStock.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Stock bajo en{" "}
                    {alertasStock.length} producto
                    {alertasStock.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alertasStock.map((p) => (
                      <span
                        key={p.nombre}
                        className="bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {p.nombre}: <strong>{p.stock_actual}</strong> / mín{" "}
                        {p.stock_minimo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit flex-wrap">
                <TabBtn
                  active={tab === "ventas"}
                  onClick={() => setTab("ventas")}
                  icon={TrendingUp}
                  label="Ventas"
                />
                <TabBtn
                  active={tab === "productos"}
                  onClick={() => setTab("productos")}
                  icon={Package}
                  label="Productos"
                />
                <TabBtn
                  active={tab === "reparto"}
                  onClick={() => setTab("reparto")}
                  icon={Truck}
                  label="Reparto"
                />
                <TabBtn
                  active={tab === "stock"}
                  onClick={() => setTab("stock")}
                  icon={Package}
                  label="Stock"
                />
                <TabBtn
                  active={tab === "creditos"}
                  onClick={() => setTab("creditos")}
                  icon={Wallet}
                  label="Créditos"
                />
              </div>

              {/* ── TAB VENTAS ── */}
              {tab === "ventas" && (
                <div className="space-y-5">
                  {/* Ventas por día */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-4">
                      Ventas por Día (período seleccionado)
                    </h2>
                    {ventasDia.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-10">
                        Sin ventas en este período
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={ventasDia}
                          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="dia"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickFormatter={(v) => v.slice(5)}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                            width={45}
                          />
                          <Tooltip content={<TooltipVentas />} />
                          <Bar
                            dataKey="total"
                            name="Total"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Ventas mensuales año actual */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-4">
                      Ventas Mensuales ({new Date().getFullYear()})
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={ventasMes}
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                          width={45}
                        />
                        <Tooltip content={<TooltipVentas />} />
                        <Bar
                          dataKey="total"
                          name="Total"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabla detalle ventas */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="font-semibold text-gray-700">
                        Detalle de Ventas del Período
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {[
                              "Fecha",
                              "Cliente",
                              "Tipo",
                              "Total",
                              "Estado",
                            ].map((h) => (
                              <th
                                key={h}
                                className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${
                                  h === "Total"
                                    ? "text-right"
                                    : h === "Estado"
                                      ? "text-center"
                                      : "text-left"
                                }`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {detalle.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="text-center py-10 text-gray-400 text-sm"
                              >
                                Sin datos
                              </td>
                            </tr>
                          )}
                          {detalle.map((v, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-5 py-3 text-gray-500 text-xs">
                                {v.fecha}
                              </td>
                              <td className="px-5 py-3 font-medium text-gray-800">
                                {v.cliente}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    v.tipo_venta === "ruta"
                                      ? "bg-orange-100 text-orange-700"
                                      : v.tipo_venta === "pedido"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {v.tipo_venta}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-gray-800">
                                {fmt(v.total)}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    v.estado === "pagada"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : v.estado === "pendiente"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {v.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB PRODUCTOS ── */}
              {tab === "productos" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-700">
                      Top 10 Productos Más Vendidos
                    </h2>
                  </div>
                  {productos.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">
                      Sin datos en el período
                    </p>
                  ) : (
                    <>
                      <div className="p-5">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={productos.slice(0, 8)}
                            layout="vertical"
                            margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                            />
                            <YAxis
                              type="category"
                              dataKey="nombre"
                              tick={{ fontSize: 11, fill: "#374151" }}
                              width={60}
                            />
                            <Tooltip formatter={(v) => [v, "Unidades"]} />
                            <Bar
                              dataKey="unidades_vendidas"
                              name="Unidades"
                              fill="#10b981"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="overflow-x-auto border-t border-gray-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                #
                              </th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Producto
                              </th>
                              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                                Unidades
                              </th>
                              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                                Ingresos
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {productos.map((p, i) => (
                              <tr
                                key={i}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                                  {i + 1}
                                </td>
                                <td className="px-5 py-3 font-medium text-gray-800">
                                  {p.nombre}
                                </td>
                                <td className="px-5 py-3 text-center font-bold text-emerald-600">
                                  {p.unidades_vendidas}
                                </td>
                                <td className="px-5 py-3 text-right font-bold text-gray-800">
                                  {fmt(p.ingresos)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB REPARTO ── */}
              {tab === "reparto" && (
                <div className="space-y-5">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-4">
                      Garrafones y Efectivo por Día
                    </h2>
                    {repartoDia.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-10">
                        Sin rutas en el período
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={repartoDia}
                          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="dia"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickFormatter={(v) => v.slice(5)}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            width={40}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="garrafones"
                            name="Garrafones"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="rutas"
                            name="Rutas"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="font-semibold text-gray-700">
                        Detalle de Reparto
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {["Día", "Rutas", "Garrafones", "Efectivo"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${
                                    h === "Efectivo"
                                      ? "text-right"
                                      : h === "Rutas" || h === "Garrafones"
                                        ? "text-center"
                                        : "text-left"
                                  }`}
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {repartoDia.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center py-10 text-gray-400 text-sm"
                              >
                                Sin datos
                              </td>
                            </tr>
                          )}
                          {repartoDia.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-5 py-3 text-gray-500 text-xs">
                                {r.dia}
                              </td>
                              <td className="px-5 py-3 text-center font-bold text-violet-600">
                                {r.rutas}
                              </td>
                              <td className="px-5 py-3 text-center font-bold text-sky-600">
                                {r.garrafones}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-gray-800">
                                {fmt(r.efectivo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB STOCK ── */}
              {tab === "stock" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">
                      Stock Actual de Productos
                    </h2>
                    {alertasStock.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{" "}
                        {alertasStock.length} alertas
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {[
                            "Producto",
                            "Tipo",
                            "Stock",
                            "Mínimo",
                            "P. Venta",
                            "P. Costo",
                            "Estado",
                          ].map((h) => (
                            <th
                              key={h}
                              className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${
                                [
                                  "Stock",
                                  "Mínimo",
                                  "P. Venta",
                                  "P. Costo",
                                ].includes(h)
                                  ? "text-center"
                                  : h === "Estado"
                                    ? "text-center"
                                    : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {stock.map((p, i) => (
                          <tr
                            key={i}
                            className={`hover:bg-gray-50 transition-colors ${p.alerta ? "bg-amber-50/30" : ""}`}
                          >
                            <td className="px-5 py-3 font-medium text-gray-800">
                              {p.nombre}
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs capitalize">
                              {p.tipo?.replace("_", " ")}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span
                                className={`font-bold text-base ${p.alerta ? "text-red-500" : "text-gray-700"}`}
                              >
                                {p.stock_actual}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-gray-400 text-xs">
                              {p.stock_minimo}
                            </td>
                            <td className="px-5 py-3 text-center font-medium text-emerald-600">
                              {fmt(p.precio_venta)}
                            </td>
                            <td className="px-5 py-3 text-center text-gray-500">
                              {fmt(p.precio_costo)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {p.alerta ? (
                                <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-red-200">
                                  Stock bajo
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB CRÉDITOS ── */}
              {tab === "creditos" && (
                <div className="space-y-5">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-4">
                      Abonos Recibidos por Día
                    </h2>
                    {abonosDia.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-10">
                        Sin abonos en el período
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart
                          data={abonosDia}
                          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="dia"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickFormatter={(v) => v.slice(5)}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            width={45}
                            tickFormatter={(v) => `Q${v}`}
                          />
                          <Tooltip content={<TooltipVentas />} />
                          <Line
                            dataKey="total_abonado"
                            name="Abonado"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="font-semibold text-gray-700">
                        Detalle de Abonos
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {["Día", "# Abonos", "Total Abonado"].map((h) => (
                              <th
                                key={h}
                                className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${
                                  h === "Total Abonado"
                                    ? "text-right"
                                    : h === "# Abonos"
                                      ? "text-center"
                                      : "text-left"
                                }`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {abonosDia.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="text-center py-10 text-gray-400 text-sm"
                              >
                                Sin datos
                              </td>
                            </tr>
                          )}
                          {abonosDia.map((a, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-5 py-3 text-gray-500 text-xs">
                                {a.dia}
                              </td>
                              <td className="px-5 py-3 text-center font-bold text-sky-600">
                                {a.num_abonos}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-emerald-600">
                                {fmt(a.total_abonado)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Layout>
  );
};

export default Reportes;
