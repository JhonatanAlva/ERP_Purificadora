import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  Truck,
  Plus,
  Search,
  Eye,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Clock,
  Package,
  DollarSign,
  AlertTriangle,
  ArrowDownCircle,
  RotateCcw,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `Q ${(parseFloat(n) || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const ESTADO_STYLES = {
  en_ruta: "bg-blue-100 text-blue-700",
  cerrada: "bg-emerald-100 text-emerald-700",
  pendiente: "bg-amber-100 text-amber-700",
};

const ESTADO_LABEL = {
  en_ruta: "En Ruta",
  cerrada: "Cerrada",
  pendiente: "Pendiente",
};

const FORM_SALIDA_INICIAL = {
  fecha: new Date().toISOString().split("T")[0],
  piloto: "",
  camion: "",
  zona_ruta: "",
  hora_salida: "",
  observaciones: "",
  detalle: [],
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  const found = Object.values(payload).find(Array.isArray);
  return found || [];
};

// ─── Component ───────────────────────────────────────────────────────────────

const Reparto = () => {
  const [rutas, setRutas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageLocal, setPageLocal] = useState(1);
  const LIMIT = 12;

  const [modalSalida, setModalSalida] = useState(false);
  const [modalRegreso, setModalRegreso] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  const [formSalida, setFormSalida] = useState(FORM_SALIDA_INICIAL);
  const [formRegreso, setFormRegreso] = useState({
    hora_regreso: "",
    efectivo_entregado: "",
    notas_regreso: "",
    detalle: [],
  });

  // ── Carga ────────────────────────────────────────────────────────────────

  const cargarRutas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: LIMIT,
        ...(filtroEstado !== "todos" && { estado: filtroEstado }),
      };
      const { data } = await api.get("/reparto", { params });
      setRutas(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError("No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado]);

  const cargarCatalogos = async () => {
    const [resProd, resSt] = await Promise.allSettled([
      api.get("/inventario/productos"),
      api.get("/reparto/estadisticas"),
    ]);
    if (resProd.status === "fulfilled")
      setProductos(toArray(resProd.value.data));
    if (resSt.status === "fulfilled") {
      const st = resSt.value.data;
      setStats(st?.data ?? st ?? null);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);
  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);
  useEffect(() => {
    setPageLocal(1);
  }, [search, filtroEstado]);

  // ── Búsqueda local ───────────────────────────────────────────────────────

  const rutasFiltradas = rutas.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.folio?.toLowerCase().includes(q) ||
      r.piloto?.toLowerCase().includes(q) ||
      r.camion?.toLowerCase().includes(q) ||
      r.zona_ruta?.toLowerCase().includes(q)
    );
  });

  // Paginacion local de tarjetas
  const CARDS_PER_PAGE = 4;
  const totalPaginasLocal = Math.ceil(rutasFiltradas.length / CARDS_PER_PAGE);
  const rutasPaginadas = rutasFiltradas.slice(
    (pageLocal - 1) * CARDS_PER_PAGE,
    pageLocal * CARDS_PER_PAGE,
  );

  // Solo productos con stock > 0
  const productosDisponibles = productos.filter(
    (p) => (p.stock_actual || 0) > 0,
  );

  // ── Carrito de salida ────────────────────────────────────────────────────

  const agregarProductoSalida = (prod) => {
    setFormSalida((prev) => {
      const existe = prev.detalle.find((i) => i.producto_id === prod.id);
      const detalle = existe
        ? prev.detalle.map((i) =>
            i.producto_id === prod.id
              ? {
                  ...i,
                  cantidad_salida:
                    i.cantidad_salida >= i.stock_actual
                      ? i.stock_actual
                      : i.cantidad_salida + 1,
                }
              : i,
          )
        : [
            ...prev.detalle,
            {
              producto_id: prod.id,
              nombre: prod.nombre,
              tipo: prod.tipo,
              stock_actual: prod.stock_actual,
              cantidad_salida: 1,
            },
          ];
      return { ...prev, detalle };
    });
  };

  const quitarProductoSalida = (producto_id) =>
    setFormSalida((prev) => ({
      ...prev,
      detalle: prev.detalle.filter((i) => i.producto_id !== producto_id),
    }));

  const actualizarCantidadSalida = (producto_id, val) => {
    setFormSalida((prev) => ({
      ...prev,

      detalle: prev.detalle.map((i) => {
        if (i.producto_id !== producto_id) {
          return i;
        }

        const cantidad = parseInt(val) || 0;

        // Limitar al stock existente
        const cantidadFinal = Math.min(cantidad, i.stock_actual);

        return {
          ...i,
          cantidad_salida: cantidadFinal,
        };
      }),
    }));
  };

  const totalGarrafonesSalida = formSalida.detalle.reduce(
    (s, i) => s + (i.cantidad_salida || 0),
    0,
  );

  // ── Guardar salida ───────────────────────────────────────────────────────

  const handleGuardarSalida = async () => {
    if (!formSalida.piloto || formSalida.detalle.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/reparto", {
        fecha: formSalida.fecha,
        piloto: formSalida.piloto,
        camion: formSalida.camion,
        zona_ruta: formSalida.zona_ruta,
        hora_salida: formSalida.hora_salida,
        observaciones: formSalida.observaciones,
        detalle: formSalida.detalle.map(({ producto_id, cantidad_salida }) => ({
          producto_id,
          cantidad_salida,
        })),
      });
      setModalSalida(false);
      setFormSalida(FORM_SALIDA_INICIAL);
      await Promise.all([cargarRutas(), cargarCatalogos()]);
    } catch (e) {
      setError(e.response?.data?.message || "Error al registrar la salida.");
    } finally {
      setSaving(false);
    }
  };

  // ── Abrir modal de regreso ────────────────────────────────────────────────

  const abrirRegreso = async (ruta) => {
    try {
      const { data } = await api.get(`/reparto/${ruta.id}`);
      const rutaCompleta = data.data ?? data;
      setModalRegreso(rutaCompleta);
      setFormRegreso({
        hora_regreso: "",
        efectivo_entregado: "",
        notas_regreso: "",
        detalle: (rutaCompleta.detalle || []).map((item) => ({
          producto_id: item.producto_id,
          nombre: item.producto_nombre || item.nombre,
          cantidad_salida: item.cantidad_salida,
          cantidad_vendida: 0,
          cantidad_devuelta: 0,
        })),
      });
    } catch {
      setError("No se pudo cargar el detalle de la ruta.");
    }
  };

  // ── Calcular efectivo esperado ───────────────────────────────────────────

  const calcularEfectivoEsperado = () => {
    return formRegreso.detalle.reduce((sum, item) => {
      const vendidos = item.cantidad_vendida || 0;

      const prod = productos.find((p) => p.id === item.producto_id);

      return sum + vendidos * (parseFloat(prod?.precio_venta) || 0);
    }, 0);
  };

  // ── Guardar regreso ──────────────────────────────────────────────────────

  const handleGuardarRegreso = async () => {
    if (!modalRegreso) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/reparto/${modalRegreso.id}/cerrar`, {
        hora_regreso: formRegreso.hora_regreso,
        efectivo_entregado: parseFloat(formRegreso.efectivo_entregado) || 0,
        notas_regreso: formRegreso.notas_regreso,
        detalle: formRegreso.detalle.map(
          ({
            producto_id,
            cantidad_salida,
            cantidad_vendida,
            cantidad_devuelta,
          }) => ({
            producto_id,

            cantidad_salida,

            cantidad_vendida: cantidad_vendida || 0,

            cantidad_devuelta: cantidad_devuelta || 0,
          }),
        ),
      });
      setModalRegreso(null);
      await Promise.all([cargarRutas(), cargarCatalogos()]);
    } catch (e) {
      setError(e.response?.data?.message || "Error al registrar el regreso.");
    } finally {
      setSaving(false);
    }
  };

  // ── Ver detalle ───────────────────────────────────────────────────────────

  const verDetalle = async (ruta) => {
    try {
      const { data } = await api.get(`/reparto/${ruta.id}`);
      setModalDetalle(data.data ?? data);
    } catch {
      setModalDetalle(ruta);
    }
  };

  // const totalPaginas = Math.ceil(total / LIMIT);
  const efectivoEsperado = calcularEfectivoEsperado();
  const diferenciaEfectivo =
    (parseFloat(formRegreso.efectivo_entregado) || 0) - efectivoEsperado;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-5 p-1">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-500" /> Reparto
            </h1>
            <p className="text-sm text-gray-500">
              {stats?.en_ruta ?? 0} en ruta · {total} rutas registradas
            </p>
          </div>
          <button
            onClick={() => {
              setModalSalida(true);
              setError("");
            }}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Registrar Salida
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Rutas hoy",
                value: stats.garrafones_hoy + " grf",
                color: "text-sky-600",
              },
              {
                label: "En ruta",
                value: stats.en_ruta,
                color: "text-blue-600",
              },
              {
                label: "Efectivo total",
                value: fmt(stats.efectivo_total),
                color: "text-emerald-600",
              },
              {
                label: "Total garrafones",
                value: stats.total_garrafones,
                color: "text-gray-800",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
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
              placeholder="Buscar piloto, camión, zona, folio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["todos", "en_ruta", "cerrada", "pendiente"].map((e) => (
              <button
                key={e}
                onClick={() => {
                  setFiltroEstado(e);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filtroEstado === e
                    ? "bg-sky-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e === "todos" ? "Todos" : ESTADO_LABEL[e]}
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

        {/* Grid de tarjetas */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        ) : rutasFiltradas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No hay rutas registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rutasPaginadas.map((r) => {
              const tieneDif =
                r.estado === "cerrada" &&
                (Math.abs(r.diferencia_efectivo || 0) > 0.01 ||
                  Math.abs(r.diferencia_garrafones || 0) > 0);
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${tieneDif ? "border-amber-200" : "border-gray-100"}`}
                >
                  {/* Cabecera tarjeta */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{r.piloto}</p>
                        {tieneDif && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">
                        {r.folio}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_STYLES[r.estado] || "bg-gray-100 text-gray-600"}`}
                    >
                      {ESTADO_LABEL[r.estado] || r.estado}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      {r.camion || "—"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {r.zona_ruta || "—"}
                    </div>
                    <div className="text-gray-500">
                      Fecha:{" "}
                      <span className="font-medium text-gray-700">
                        {r.fecha}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3 text-gray-400" />
                      Salida:{" "}
                      <span className="font-medium text-gray-700 ml-1">
                        {r.hora_salida || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex gap-3 text-sm mb-3">
                    <div className="flex-1 bg-sky-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Garrafones salida</p>
                      <p className="font-bold text-sky-700 text-lg">
                        {r.total_garrafones_salida || 0}
                      </p>
                    </div>
                    {r.estado === "cerrada" && (
                      <div className="flex-1 bg-emerald-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Efectivo</p>
                        <p className="font-bold text-emerald-700 text-sm">
                          {fmt(r.efectivo_entregado)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Diferencias si está cerrada */}
                  {r.estado === "cerrada" && (
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div
                        className={`px-2 py-1.5 rounded-lg ${Math.abs(r.diferencia_efectivo || 0) > 0.01 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        <span className="font-medium">Dif. Efectivo: </span>
                        {fmt(r.diferencia_efectivo)}
                      </div>
                      <div
                        className={`px-2 py-1.5 rounded-lg ${Math.abs(r.diferencia_garrafones || 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        <span className="font-medium">Dif. Garrafones: </span>
                        {r.diferencia_garrafones || 0}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => verDetalle(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-sky-600 hover:bg-sky-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Detalle
                    </button>
                    {r.estado === "en_ruta" && (
                      <button
                        onClick={() => abrirRegreso(r)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Registrar
                        Regreso
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación local de tarjetas */}
        {totalPaginasLocal > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 text-sm text-gray-500">
            <span>
              {rutasFiltradas.length} rutas · Página {pageLocal} de{" "}
              {totalPaginasLocal}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPageLocal((p) => Math.max(1, p - 1))}
                disabled={pageLocal === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPaginasLocal }, (_, i) => i + 1).map(
                (n) => (
                  <button
                    key={n}
                    onClick={() => setPageLocal(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pageLocal === n ? "bg-sky-600 text-white" : "hover:bg-gray-100"}`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setPageLocal((p) => Math.min(totalPaginasLocal, p + 1))
                }
                disabled={pageLocal === totalPaginasLocal}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ Modal Registrar Salida ══════════════════════════════════════════ */}
      {modalSalida && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-sky-500" /> Registrar
                Salida
              </h3>
              <button
                onClick={() => setModalSalida(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formSalida.fecha}
                    onChange={(e) =>
                      setFormSalida({ ...formSalida, fecha: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de salida
                  </label>
                  <input
                    type="time"
                    value={formSalida.hora_salida}
                    onChange={(e) =>
                      setFormSalida({
                        ...formSalida,
                        hora_salida: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Piloto *
                  </label>
                  <input
                    value={formSalida.piloto}
                    onChange={(e) =>
                      setFormSalida({ ...formSalida, piloto: e.target.value })
                    }
                    placeholder="Nombre del piloto"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Camión / Unidad
                  </label>
                  <input
                    value={formSalida.camion}
                    onChange={(e) =>
                      setFormSalida({ ...formSalida, camion: e.target.value })
                    }
                    placeholder="Placa o identificación"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona / Ruta
                  </label>
                  <input
                    value={formSalida.zona_ruta}
                    onChange={(e) =>
                      setFormSalida({
                        ...formSalida,
                        zona_ruta: e.target.value,
                      })
                    }
                    placeholder="Zona o ruta asignada"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Package className="w-4 h-4 text-gray-400" /> Productos a
                  cargar
                </label>
                {productosDisponibles.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No hay productos disponibles
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-2">
                    {productosDisponibles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => agregarProductoSalida(p)}
                        className="text-left p-2 rounded-lg hover:bg-sky-50 border border-gray-100 hover:border-sky-200 transition-all"
                      >
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {p.nombre}
                        </p>
                        <p className="text-xs text-gray-400">
                          Stock: {p.stock_actual}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Detalle */}
              {formSalida.detalle.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                          Producto
                        </th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          Cantidad
                        </th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formSalida.detalle.map((item) => (
                        <tr key={item.producto_id}>
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {item.nombre}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad_salida}
                              onChange={(e) =>
                                actualizarCantidadSalida(
                                  item.producto_id,
                                  e.target.value,
                                )
                              }
                              className="w-20 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() =>
                                quitarProductoSalida(item.producto_id)
                              }
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center font-bold text-sm px-3 py-2.5 bg-sky-50 border-t border-sky-100">
                    <span className="text-sky-700">Total garrafones:</span>
                    <span className="text-sky-700 text-base">
                      {totalGarrafonesSalida}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formSalida.observaciones}
                  onChange={(e) =>
                    setFormSalida({
                      ...formSalida,
                      observaciones: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Opcional..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModalSalida(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarSalida}
                disabled={
                  saving ||
                  !formSalida.piloto ||
                  formSalida.detalle.length === 0
                }
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  "Registrar Salida"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Registrar Regreso ═════════════════════════════════════════ */}
      {modalRegreso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-500" />
                Registrar Regreso — {modalRegreso.piloto}
              </h3>
              <button
                onClick={() => setModalRegreso(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Resumen de salida */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-sky-700 uppercase mb-2">
                  Resumen de salida
                </p>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Folio</p>
                    <p className="font-mono font-bold text-gray-700">
                      {modalRegreso.folio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Garrafones salida</p>
                    <p className="font-bold text-sky-700 text-xl">
                      {modalRegreso.total_garrafones_salida || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Zona</p>
                    <p className="font-bold text-gray-700">
                      {modalRegreso.zona_ruta || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hora regreso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de regreso
                  </label>
                  <input
                    type="time"
                    value={formRegreso.hora_regreso}
                    onChange={(e) =>
                      setFormRegreso({
                        ...formRegreso,
                        hora_regreso: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* Control de productos */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Control de productos
                </p>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                          Producto
                        </th>

                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          Salida
                        </th>

                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          Vendido
                        </th>

                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          Devuelto
                        </th>

                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          Dif.
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {formRegreso.detalle.map((item, idx) => {
                        const diferencia =
                          item.cantidad_salida -
                          (item.cantidad_vendida || 0) -
                          (item.cantidad_devuelta || 0);

                        return (
                          <tr key={item.producto_id}>
                            <td className="px-3 py-2 font-medium text-gray-700">
                              {item.nombre}
                            </td>

                            <td className="px-3 py-2 text-center text-gray-500">
                              {item.cantidad_salida}
                            </td>

                            {/* VENDIDO */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.cantidad_salida}
                                value={item.cantidad_vendida}
                                onChange={(e) => {
                                  const nuevos = [...formRegreso.detalle];

                                  nuevos[idx] = {
                                    ...item,
                                    cantidad_vendida:
                                      parseInt(e.target.value) || 0,
                                  };

                                  setFormRegreso({
                                    ...formRegreso,
                                    detalle: nuevos,
                                  });
                                }}
                                className="w-20 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                              />
                            </td>

                            {/* DEVUELTO */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.cantidad_salida}
                                value={item.cantidad_devuelta}
                                onChange={(e) => {
                                  const nuevos = [...formRegreso.detalle];

                                  nuevos[idx] = {
                                    ...item,
                                    cantidad_devuelta:
                                      parseInt(e.target.value) || 0,
                                  };

                                  setFormRegreso({
                                    ...formRegreso,
                                    detalle: nuevos,
                                  });
                                }}
                                className="w-20 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                              />
                            </td>

                            {/* DIFERENCIA */}
                            <td
                              className={`px-3 py-2 text-center font-bold ${
                                diferencia === 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {diferencia}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Control de efectivo */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Control de efectivo
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Efectivo esperado:</span>
                  <span className="font-bold text-emerald-700">
                    {fmt(efectivoEsperado)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Efectivo entregado
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formRegreso.efectivo_entregado}
                    onChange={(e) =>
                      setFormRegreso({
                        ...formRegreso,
                        efectivo_entregado: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full sm:w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                {formRegreso.efectivo_entregado !== "" && (
                  <div
                    className={`flex justify-between items-center font-bold text-sm p-2 rounded-lg ${
                      diferenciaEfectivo < -0.01
                        ? "bg-red-100 text-red-700"
                        : diferenciaEfectivo > 0.01
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <span>Diferencia:</span>
                    <span>{fmt(diferenciaEfectivo)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas del regreso
                </label>
                <textarea
                  value={formRegreso.notas_regreso}
                  onChange={(e) =>
                    setFormRegreso({
                      ...formRegreso,
                      notas_regreso: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Observaciones del piloto..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModalRegreso(null)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarRegreso}
                disabled={saving || formRegreso.detalle.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  "Confirmar Regreso"
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
              <h3 className="font-bold text-gray-800">
                Detalle — {modalDetalle.folio}
              </h3>
              <button
                onClick={() => setModalDetalle(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Piloto", modalDetalle.piloto],
                  ["Camión", modalDetalle.camion || "—"],
                  ["Fecha", modalDetalle.fecha],
                  ["Zona", modalDetalle.zona_ruta || "—"],
                  ["Salida", modalDetalle.hora_salida || "—"],
                  ["Regreso", modalDetalle.hora_regreso || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {label}
                    </span>
                    <p className="font-medium text-gray-800 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Productos */}
              {Array.isArray(modalDetalle.detalle) &&
                modalDetalle.detalle.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Productos
                    </p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                              Producto
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                              Salida
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                              Vendido
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                              Devuelto
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {modalDetalle.detalle.map((item, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-gray-700">
                                {item.producto_nombre || item.nombre}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.cantidad_salida}
                              </td>
                              <td className="px-3 py-2 text-center text-emerald-600 font-semibold">
                                {item.cantidad_vendida ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-center text-amber-600">
                                {item.cantidad_devuelta ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Resumen financiero si está cerrada */}
              {modalDetalle.estado === "cerrada" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Efectivo esperado",
                      value: fmt(modalDetalle.efectivo_esperado),
                      bg: "bg-gray-50",
                      text: "text-gray-700",
                    },
                    {
                      label: "Efectivo entregado",
                      value: fmt(modalDetalle.efectivo_entregado),
                      bg: "bg-emerald-50",
                      text: "text-emerald-700",
                    },
                    {
                      label: "Dif. efectivo",
                      value: fmt(modalDetalle.diferencia_efectivo),
                      bg:
                        Math.abs(modalDetalle.diferencia_efectivo || 0) > 0.01
                          ? "bg-red-50"
                          : "bg-green-50",
                      text:
                        Math.abs(modalDetalle.diferencia_efectivo || 0) > 0.01
                          ? "text-red-700"
                          : "text-green-700",
                    },
                    {
                      label: "Dif. garrafones",
                      value: modalDetalle.diferencia_garrafones ?? 0,
                      bg:
                        Math.abs(modalDetalle.diferencia_garrafones || 0) > 0
                          ? "bg-amber-50"
                          : "bg-green-50",
                      text:
                        Math.abs(modalDetalle.diferencia_garrafones || 0) > 0
                          ? "text-amber-700"
                          : "text-green-700",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`${s.bg} rounded-lg p-3 text-center`}
                    >
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`font-bold ${s.text}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {modalDetalle.observaciones && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                  {modalDetalle.observaciones}
                </p>
              )}
              {modalDetalle.notas_regreso && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                  {modalDetalle.notas_regreso}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Reparto;
