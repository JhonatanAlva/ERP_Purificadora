import { pool } from "../config/db.js";

// ─── Helper fecha ────────────────────────────────────────────────────────────
const rangoDefault = () => {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(1); // primer día del mes actual
    return {
        fecha_inicio: inicio.toISOString().split("T")[0],
        fecha_fin: fin.toISOString().split("T")[0],
    };
};

// ─── RESUMEN GENERAL ─────────────────────────────────────────────────────────

export const getResumen = async ({ fecha_inicio, fecha_fin }) => {
    const { fi, ff } = { fi: fecha_inicio, ff: fecha_fin };

    const [ventas, rutas, creditos, compras] = await Promise.all([
        // Ventas del período
        pool.query(`
      SELECT
        COUNT(*)                          AS num_ventas,
        COALESCE(SUM(total), 0)           AS total_ventas,
        COALESCE(AVG(total), 0)           AS ticket_promedio
      FROM ventas
      WHERE fecha::date BETWEEN $1 AND $2
        AND estado != 'cancelada'
    `, [fi, ff]),

        // Rutas del período
        pool.query(`
      SELECT
        COUNT(*)                                                              AS total_rutas,
        COALESCE(SUM(CASE WHEN estado='cerrada' THEN 1 ELSE 0 END), 0)       AS rutas_cerradas,
        COALESCE(SUM(total_garrafones_salida), 0)                            AS garrafones_salida,
        COALESCE(SUM(efectivo_entregado), 0)                                 AS efectivo_reparto
      FROM rutas
      WHERE fecha::date BETWEEN $1 AND $2
    `, [fi, ff]),

        // Créditos activos y cobrado en el período
        pool.query(`
      SELECT
        COALESCE(SUM(saldo_actual), 0)        AS cartera_pendiente,
        COALESCE(SUM(monto_total - saldo_actual), 0) AS cobrado_total
      FROM creditos
      WHERE estado != 'cancelado'
    `),

        // Gasto en compras del período
        pool.query(`
      SELECT COALESCE(SUM(total), 0) AS gasto_compras
      FROM compras
      WHERE fecha::date BETWEEN $1 AND $2
        AND estado = 'recibida'
    `, [fi, ff]),
    ]);

    const tv = ventas.rows[0];
    const tr = rutas.rows[0];
    const tc = creditos.rows[0];
    const co = compras.rows[0];

    return {
        ventas: {
            num_ventas: parseInt(tv.num_ventas),
            total_ventas: parseFloat(tv.total_ventas),
            ticket_promedio: parseFloat(tv.ticket_promedio),
        },
        reparto: {
            total_rutas: parseInt(tr.total_rutas),
            rutas_cerradas: parseInt(tr.rutas_cerradas),
            garrafones_salida: parseInt(tr.garrafones_salida),
            efectivo_reparto: parseFloat(tr.efectivo_reparto),
        },
        creditos: {
            cartera_pendiente: parseFloat(tc.cartera_pendiente),
            cobrado_total: parseFloat(tc.cobrado_total),
        },
        compras: {
            gasto_compras: parseFloat(co.gasto_compras),
        },
        utilidad_estimada: parseFloat(tv.total_ventas) - parseFloat(co.gasto_compras),
    };
};

// ─── VENTAS POR DÍA ──────────────────────────────────────────────────────────

export const getVentasPorDia = async ({ fecha_inicio, fecha_fin }) => {
    const { rows } = await pool.query(`
    SELECT
      TO_CHAR(fecha::date, 'YYYY-MM-DD') AS dia,
      COUNT(*)                            AS num_ventas,
      COALESCE(SUM(total), 0)             AS total
    FROM ventas
    WHERE fecha::date BETWEEN $1 AND $2
      AND estado != 'cancelada'
    GROUP BY fecha::date
    ORDER BY fecha::date ASC
  `, [fecha_inicio, fecha_fin]);
    return rows;
};

// ─── VENTAS POR MES (año actual) ─────────────────────────────────────────────

export const getVentasPorMes = async () => {
    const { rows } = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM fecha)::int       AS mes,
      TO_CHAR(fecha, 'Mon')                AS mes_nombre,
      COALESCE(SUM(total), 0)              AS total,
      COUNT(*)                             AS num_ventas
    FROM ventas
    WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND estado != 'cancelada'
    GROUP BY EXTRACT(MONTH FROM fecha), TO_CHAR(fecha, 'Mon')
    ORDER BY mes ASC
  `);
    return rows;
};

// ─── PRODUCTOS MÁS VENDIDOS ──────────────────────────────────────────────────

export const getProductosMasVendidos = async ({ fecha_inicio, fecha_fin }) => {
    const { rows } = await pool.query(`
    SELECT
      p.nombre,
      p.tipo,
      SUM(vd.cantidad)                          AS unidades_vendidas,
      SUM(vd.cantidad * vd.precio_unitario)     AS ingresos
    FROM venta_detalle vd
    JOIN productos p ON p.id = vd.producto_id
    JOIN ventas v    ON v.id = vd.venta_id
    WHERE v.fecha::date BETWEEN $1 AND $2
      AND v.estado != 'cancelada'
    GROUP BY p.id, p.nombre, p.tipo
    ORDER BY unidades_vendidas DESC
    LIMIT 10
  `, [fecha_inicio, fecha_fin]);
    return rows;
};

// ─── DETALLE DE VENTAS DEL PERÍODO ───────────────────────────────────────────

export const getDetalleVentas = async ({ fecha_inicio, fecha_fin }) => {
    const { rows } = await pool.query(`
    SELECT
      TO_CHAR(v.fecha::date, 'YYYY-MM-DD') AS fecha,
      COALESCE(cl.nombre, 'Público')        AS cliente,
      v.tipo_venta,
      v.total,
      v.estado
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE v.fecha::date BETWEEN $1 AND $2
    ORDER BY v.fecha DESC
    LIMIT 200
  `, [fecha_inicio, fecha_fin]);
    return rows;
};

// ─── REPARTO POR DÍA ─────────────────────────────────────────────────────────

export const getRepartoPorDia = async ({ fecha_inicio, fecha_fin }) => {
    const { rows } = await pool.query(`
    SELECT
      TO_CHAR(fecha, 'YYYY-MM-DD')         AS dia,
      COUNT(*)                              AS rutas,
      COALESCE(SUM(total_garrafones_salida), 0)  AS garrafones,
      COALESCE(SUM(efectivo_entregado), 0)  AS efectivo
    FROM rutas
    WHERE fecha::date BETWEEN $1 AND $2
    GROUP BY fecha
    ORDER BY fecha ASC
  `, [fecha_inicio, fecha_fin]);
    return rows;
};

// ─── STOCK ACTUAL (snapshot) ─────────────────────────────────────────────────

export const getStockActual = async () => {
    const { rows } = await pool.query(`
    SELECT
      nombre,
      tipo,
      stock_actual,
      stock_minimo,
      precio_venta,
      precio_costo,
      CASE WHEN stock_actual <= stock_minimo THEN true ELSE false END AS alerta
    FROM productos
    WHERE activo = true
    ORDER BY stock_actual ASC
  `);
    return rows;
};

// ─── ABONOS DEL PERÍODO ──────────────────────────────────────────────────────

export const getAbonosPorDia = async ({ fecha_inicio, fecha_fin }) => {
    const { rows } = await pool.query(`
    SELECT
      TO_CHAR(a.created_at::date, 'YYYY-MM-DD') AS dia,
      COUNT(*)                                   AS num_abonos,
      COALESCE(SUM(a.monto), 0)                  AS total_abonado
    FROM abonos a
    WHERE a.created_at::date BETWEEN $1 AND $2
    GROUP BY a.created_at::date
    ORDER BY a.created_at::date ASC
  `, [fecha_inicio, fecha_fin]);
    return rows;
};