import { pool } from "../config/db.js";

// ─── CRÉDITOS ────────────────────────────────────────────────────────────────

export const getAllCreditos = async ({ estado, cliente_id, page = 1, limit = 20 }) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (estado) { conditions.push(`c.estado = $${idx++}`); values.push(estado); }
    if (cliente_id) { conditions.push(`c.cliente_id = $${idx++}`); values.push(cliente_id); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
        `SELECT
        c.id, c.monto_total, c.saldo_actual, c.estado, c.venta_id,
        TO_CHAR(c.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
        TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD')        AS fecha_inicio,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        -- Último abono
        (SELECT TO_CHAR(MAX(a.created_at), 'YYYY-MM-DD') FROM abonos a WHERE a.credito_id = c.id) AS ultimo_abono
     FROM creditos c
     LEFT JOIN clientes cl ON cl.id = c.cliente_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset]
    );

    const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM creditos c ${where}`,
        values
    );

    return { data: rows, total: parseInt(countRows[0].count), page, limit };
};

export const getCreditoById = async (id) => {
    const { rows } = await pool.query(
        `SELECT
        c.*,
        TO_CHAR(c.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
        TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD')        AS fecha_inicio,
        cl.nombre    AS cliente_nombre,
        cl.telefono  AS cliente_telefono,
        cl.direccion AS cliente_direccion
     FROM creditos c
     LEFT JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.id = $1`,
        [id]
    );
    if (!rows[0]) return null;

    const { rows: abonos } = await pool.query(
        `SELECT id, monto,
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
     FROM abonos
     WHERE credito_id = $1
     ORDER BY created_at DESC`,
        [id]
    );

    return { ...rows[0], abonos };
};

export const createCredito = async ({ cliente_id, monto_total, venta_id }) => {
    // Validar que el monto sea positivo
    if (!monto_total || parseFloat(monto_total) <= 0) {
        throw new Error("El monto del crédito debe ser mayor a cero");
    }

    const { rows } = await pool.query(
        `INSERT INTO creditos (cliente_id, monto_total, saldo_actual, estado, venta_id, fecha_inicio)
     VALUES ($1, $2, $2, 'pendiente', $3, CURRENT_DATE)
     RETURNING *`,
        [cliente_id, parseFloat(monto_total), venta_id || null]
    );
    return rows[0];
};

export const registrarAbono = async (credito_id, { monto }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Bloquear fila para evitar race conditions
        const { rows: creditoRows } = await client.query(
            `SELECT id, saldo_actual, estado FROM creditos WHERE id = $1 FOR UPDATE`,
            [credito_id]
        );

        if (!creditoRows[0]) throw new Error("Crédito no encontrado");

        const credito = creditoRows[0];

        if (credito.estado === "pagado") {
            throw new Error("Este crédito ya fue pagado completamente");
        }
        if (credito.estado === "cancelado") {
            throw new Error("Este crédito fue cancelado");
        }

        const montoAbono = parseFloat(monto);
        if (montoAbono <= 0) throw new Error("El monto del abono debe ser mayor a cero");

        const saldoActual = parseFloat(credito.saldo_actual);
        if (montoAbono > saldoActual) {
            throw new Error(`El abono (Q${montoAbono}) supera el saldo pendiente (Q${saldoActual})`);
        }

        const nuevoSaldo = +(saldoActual - montoAbono).toFixed(2);
        const nuevoEstado = nuevoSaldo <= 0 ? "pagado" : "pendiente";

        // Registrar abono
        const { rows: abonoRows } = await client.query(
            `INSERT INTO abonos (credito_id, monto) VALUES ($1, $2) RETURNING *`,
            [credito_id, montoAbono]
        );

        // Actualizar saldo y estado del crédito
        await client.query(
            `UPDATE creditos SET saldo_actual = $1, estado = $2 WHERE id = $3`,
            [nuevoSaldo, nuevoEstado, credito_id]
        );

        // Si el crédito quedó pagado → actualizar la venta relacionada a "pagada"
        if (nuevoEstado === "pagado") {
            // El subquery obtiene el id de la venta desde creditos
            // El WHERE de ventas solo filtra por id (columna de ventas), no por venta_id
            await client.query(
                `UPDATE ventas SET estado = 'pagada'
         WHERE id = (
           SELECT venta_id FROM creditos
           WHERE id = $1 AND venta_id IS NOT NULL
         )
         AND estado = 'pendiente'`,
                [credito_id]
            );
        }

        await client.query("COMMIT");
        return { abono: abonoRows[0], saldo_nuevo: nuevoSaldo, estado: nuevoEstado };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const cancelarCredito = async (id) => {
    const { rows } = await pool.query(
        `UPDATE creditos SET estado = 'cancelado' WHERE id = $1 AND estado = 'pendiente'
     RETURNING *`,
        [id]
    );
    if (!rows[0]) throw new Error("No se puede cancelar: crédito no encontrado o ya cerrado");
    return rows[0];
};

// ─── ESTADÍSTICAS ────────────────────────────────────────────────────────────

export const getEstadisticasCreditos = async () => {
    const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                                               AS total_creditos,
      COALESCE(SUM(monto_total), 0)                                         AS cartera_total,
      COALESCE(SUM(saldo_actual), 0)                                        AS saldo_pendiente,
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0)   AS pendientes,
      COALESCE(SUM(CASE WHEN estado = 'pagado'    THEN 1 ELSE 0 END), 0)   AS pagados,
      COALESCE(SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END), 0)   AS cancelados,
      COALESCE(SUM(monto_total - saldo_actual), 0)                          AS cobrado_total
    FROM creditos
  `);

    // Total abonado este mes
    const { rows: mesRows } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0) AS abonos_mes
    FROM abonos
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
  `);

    return { ...rows[0], abonos_mes: mesRows[0].abonos_mes };
};