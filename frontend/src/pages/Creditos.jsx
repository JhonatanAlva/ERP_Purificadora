import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  Wallet,
  Plus,
  Search,
  Eye,
  X,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  User,
  Calendar,
  ArrowDownCircle,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `Q ${(parseFloat(n) || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const ESTADO_STYLES = {
  pendiente: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  pagado: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelado: "bg-red-50    text-red-700    ring-1 ring-red-200",
};

const ESTADO_ICON = {
  pendiente: <Clock className="w-3 h-3" />,
  pagado: <CheckCircle className="w-3 h-3" />,
  cancelado: <XCircle className="w-3 h-3" />,
};

// ─── Barra de progreso ────────────────────────────────────────────────────────

const BarraProgreso = ({ monto_total, saldo_actual }) => {
  const pagado = parseFloat(monto_total) - parseFloat(saldo_actual);
  const pct = Math.min(
    100,
    Math.max(0, (pagado / parseFloat(monto_total)) * 100),
  );
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{pct.toFixed(0)}% pagado</span>
        <span>{fmt(saldo_actual)} pendiente</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            pct >= 100
              ? "bg-emerald-500"
              : pct >= 50
                ? "bg-sky-500"
                : "bg-amber-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const Creditos = () => {
  const [creditos, setCreditos] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  // Modales
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalAbono, setModalAbono] = useState(null);

  // Formularios
  const [montoAbono, setMontoAbono] = useState("");

  // ── Carga ────────────────────────────────────────────────────────────────

  const cargarCreditos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: LIMIT,
        ...(filtroEstado !== "todos" && { estado: filtroEstado }),
      };
      const { data } = await api.get("/creditos", { params });
      setCreditos(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError("No se pudieron cargar los créditos.");
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado]);

  const cargarCatalogos = async () => {
    const { data } = await api
      .get("/creditos/estadisticas")
      .catch(() => ({ data: null }));
    if (data) setStats(data?.data ?? data ?? null);
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);
  useEffect(() => {
    cargarCreditos();
  }, [cargarCreditos]);

  // ── Búsqueda local ───────────────────────────────────────────────────────

  const creditosFiltrados = creditos.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.cliente_nombre?.toLowerCase().includes(q);
  });

  // ── Registrar abono ──────────────────────────────────────────────────────

  const handleAbonar = async () => {
    if (!montoAbono || !modalAbono) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/creditos/${modalAbono.id}/abonar`, {
        monto: parseFloat(montoAbono),
      });
      setModalAbono(null);
      setMontoAbono("");
      await Promise.all([cargarCreditos(), cargarCatalogos()]);
    } catch (e) {
      setError(e.response?.data?.message || "Error al registrar abono.");
    } finally {
      setSaving(false);
    }
  };

  // ── Ver detalle ──────────────────────────────────────────────────────────

  const verDetalle = async (credito) => {
    try {
      const { data } = await api.get(`/creditos/${credito.id}`);
      setModalDetalle(data.data ?? data);
    } catch {
      setModalDetalle(credito);
    }
  };

  // ── Cancelar ─────────────────────────────────────────────────────────────

  const handleCancelar = async (id) => {
    if (!confirm("¿Cancelar este crédito? Esta acción no se puede deshacer."))
      return;
    try {
      await api.put(`/creditos/${id}/cancelar`);
      await Promise.all([cargarCreditos(), cargarCatalogos()]);
    } catch (e) {
      setError(e.response?.data?.message || "Error al cancelar.");
    }
  };

  const totalPaginas = Math.ceil(total / LIMIT);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-5 p-1">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" /> Créditos
            </h1>
            <p className="text-sm text-gray-500">
              {total} créditos registrados
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Cartera total",
                value: fmt(stats.cartera_total),
                color: "text-gray-800",
                icon: <CreditCard className="w-4 h-4" />,
              },
              {
                label: "Saldo pendiente",
                value: fmt(stats.saldo_pendiente),
                color: "text-amber-600",
                icon: <TrendingDown className="w-4 h-4" />,
              },
              {
                label: "Cobrado total",
                value: fmt(stats.cobrado_total),
                color: "text-emerald-600",
                icon: <TrendingUp className="w-4 h-4" />,
              },
              {
                label: "Abonos este mes",
                value: fmt(stats.abonos_mes),
                color: "text-sky-600",
                icon: <DollarSign className="w-4 h-4" />,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <span className={`${s.color} opacity-60`}>{s.icon}</span>
                </div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["todos", "pendiente", "pagado", "cancelado"].map((e) => (
              <button
                key={e}
                onClick={() => {
                  setFiltroEstado(e);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filtroEstado === e
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e === "todos" ? "Todos" : e}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
          ) : creditosFiltrados.length === 0 ? (
            <div className="text-center py-20">
              <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No hay créditos registrados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Cliente",
                      "Fecha",
                      "Monto total",
                      "Progreso",
                      "Último abono",
                      "Estado",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase ${
                          h === "Monto total"
                            ? "text-right"
                            : h === "Estado" || h === ""
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
                  {creditosFiltrados.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {c.cliente_nombre || "—"}
                            </p>
                            {c.cliente_telefono && (
                              <p className="text-xs text-gray-400">
                                {c.cliente_telefono}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {c.fecha_inicio || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-800">
                        {fmt(c.monto_total)}
                      </td>
                      <td className="px-5 py-3 min-w-[160px]">
                        <BarraProgreso
                          monto_total={c.monto_total}
                          saldo_actual={c.saldo_actual}
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs text-center">
                        {c.ultimo_abono || "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[c.estado] || ""}`}
                        >
                          {ESTADO_ICON[c.estado]}
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => verDetalle(c)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {c.estado === "pendiente" && (
                            <button
                              onClick={() => {
                                setModalAbono(c);
                                setMontoAbono("");
                                setError("");
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
                              title="Registrar abono"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                          )}
                          {c.estado === "pendiente" && (
                            <button
                              onClick={() => handleCancelar(c.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                              title="Cancelar crédito"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>
                Página {page} de {totalPaginas}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Modal Registrar Abono ═══════════════════════════════════════════ */}
      {modalAbono && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-500" />{" "}
                Registrar Abono
              </h3>
              <button
                onClick={() => setModalAbono(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info del crédito */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800">
                    {modalAbono.cliente_nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto total</span>
                  <span className="font-medium text-gray-800">
                    {fmt(modalAbono.monto_total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Saldo pendiente</span>
                  <span className="font-bold text-amber-600">
                    {fmt(modalAbono.saldo_actual)}
                  </span>
                </div>
                <BarraProgreso
                  monto_total={modalAbono.monto_total}
                  saldo_actual={modalAbono.saldo_actual}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto del abono *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    Q
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={modalAbono.saldo_actual}
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    autoFocus
                  />
                </div>
                {montoAbono && (
                  <p
                    className={`text-xs mt-1 ${
                      parseFloat(montoAbono) >
                      parseFloat(modalAbono.saldo_actual)
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    Saldo restante:{" "}
                    {fmt(
                      Math.max(
                        0,
                        parseFloat(modalAbono.saldo_actual) -
                          (parseFloat(montoAbono) || 0),
                      ),
                    )}
                  </p>
                )}
              </div>

              {/* Acceso rápido: pagar todo */}
              <button
                onClick={() => setMontoAbono(String(modalAbono.saldo_actual))}
                className="w-full text-xs text-emerald-600 hover:text-emerald-700 text-center py-1.5 border border-dashed border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Liquidar total ({fmt(modalAbono.saldo_actual)})
              </button>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModalAbono(null)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbonar}
                disabled={
                  saving ||
                  !montoAbono ||
                  parseFloat(montoAbono) <= 0 ||
                  parseFloat(montoAbono) > parseFloat(modalAbono.saldo_actual)
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  "Registrar Abono"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Detalle ═══════════════════════════════════════════════════ */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800">Detalle del Crédito</h3>
              <button
                onClick={() => setModalDetalle(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Info cliente */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Cliente", modalDetalle.cliente_nombre || "—"],
                  ["Teléfono", modalDetalle.cliente_telefono || "—"],
                  ["Fecha inicio", modalDetalle.fecha_inicio || "—"],
                  ["Estado", modalDetalle.estado],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {label}
                    </span>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {label === "Estado" ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[val] || ""}`}
                        >
                          {ESTADO_ICON[val]} {val}
                        </span>
                      ) : (
                        val
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Monto total",
                    value: fmt(modalDetalle.monto_total),
                    bg: "bg-gray-50",
                    text: "text-gray-800",
                  },
                  {
                    label: "Saldo pendiente",
                    value: fmt(modalDetalle.saldo_actual),
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                  },
                  {
                    label: "Pagado",
                    value: fmt(
                      parseFloat(modalDetalle.monto_total) -
                        parseFloat(modalDetalle.saldo_actual),
                    ),
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`${s.bg} rounded-xl p-3 text-center`}
                  >
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`font-bold text-sm ${s.text}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <BarraProgreso
                monto_total={modalDetalle.monto_total}
                saldo_actual={modalDetalle.saldo_actual}
              />

              {/* Historial de abonos */}
              {Array.isArray(modalDetalle.abonos) && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Historial de abonos ({modalDetalle.abonos.length})
                  </p>
                  {modalDetalle.abonos.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">
                      Sin abonos registrados
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {modalDetalle.abonos.map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 text-gray-500">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs">{a.created_at}</span>
                          </div>
                          <span className="font-bold text-emerald-600">
                            {fmt(a.monto)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Creditos;
