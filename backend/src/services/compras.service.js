import { pool } from "../config/db.js";

// ─── COMPRAS ────────────────────────────────────────────────────────────────

export const getAllCompras = async ({ estado, proveedor_id, fecha_inicio, fecha_fin, page = 1, limit = 20 }) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (estado) { conditions.push(`c.estado = $${idx++}`); values.push(estado); }
  if (proveedor_id) { conditions.push(`c.proveedor_id = $${idx++}`); values.push(proveedor_id); }
  if (fecha_inicio) { conditions.push(`TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha >= $${idx++}`); values.push(fecha_inicio); }
  if (fecha_fin) { conditions.push(`TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha <= $${idx++}`); values.push(fecha_fin); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    `SELECT c.*,
            p.nombre AS proveedor_nombre
     FROM compras c
     LEFT JOIN proveedores p ON p.id = c.proveedor_id
     ${where}
     ORDER BY c.fecha DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM compras c ${where}`,
    values
  );

  return { data: rows, total: parseInt(countRows[0].count), page, limit };
};

export const getCompraById = async (id) => {
  const { rows } = await pool.query(
    `SELECT c.*,
            p.nombre AS proveedor_nombre
     FROM compras c
     LEFT JOIN proveedores p ON p.id = c.proveedor_id
     WHERE c.id = $1`,
    [id]
  );
  if (!rows[0]) return null;

  const { rows: detalle } = await pool.query(
    `SELECT cd.*,
            pr.nombre AS producto_nombre,
            pr.unidad
     FROM compra_detalle cd
     LEFT JOIN productos pr ON pr.id = cd.producto_id
     WHERE cd.compra_id = $1`,
    [id]
  );

  return { ...rows[0], detalle };
};

export const createCompra = async ({ proveedor_id, fecha, metodo_pago, estado = "pendiente", notas, detalle }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Calcular subtotal y total desde el detalle
    let subtotal = 0;
    for (const item of detalle) {
      subtotal += item.cantidad * item.precio_unitario;
    }
    const total = subtotal; // ajustar si hay impuestos/descuentos

    // Generar folio automático: COMP-YYYYMM-XXXX
    const { rows: folioRows } = await client.query(
      `SELECT COUNT(*) FROM compras
       WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    const consecutive = String(parseInt(folioRows[0].count) + 1).padStart(4, "0");
    const now = new Date();
    const folio = `COMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${consecutive}`;

    const { rows } = await client.query(
      `INSERT INTO compras (proveedor_id, folio, fecha, subtotal, total, metodo_pago, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [proveedor_id, folio, fecha, subtotal, total, metodo_pago, estado, notas]
    );

    const compra = rows[0];

    // Insertar detalle
    for (const item of detalle) {
      const itemSubtotal = item.cantidad * item.precio_unitario;
      await client.query(
        `INSERT INTO compra_detalle (compra_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [compra.id, item.producto_id, item.cantidad, item.precio_unitario, itemSubtotal]
      );

      // Actualizar stock si la compra se recibe de inmediato
      if (estado === "recibida") {
        // Obtener stock anterior
        const { rows: stockRows } = await client.query(
          `SELECT stock_actual FROM productos WHERE id = $1`, [item.producto_id]
        );
        const stockAnterior = stockRows[0]?.stock_actual || 0;
        const stockNuevo = stockAnterior + item.cantidad;

        // Actualizar stock
        await client.query(
          `UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2`,
          [item.cantidad, item.producto_id]
        );

        // ← Registrar movimiento
        await client.query(
          `INSERT INTO movimientos_inventario
     (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
     VALUES ($1, 'entrada', $2, $3, $4, $5, NOW())`,
          [item.producto_id, item.cantidad, stockAnterior, stockNuevo,
          `Compra ${folio}`]
        );
      }
    }

    await client.query("COMMIT");
    return compra;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updateCompra = async (id, { proveedor_id, fecha, metodo_pago, estado, notas, detalle }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Si el estado cambia a "recibida", actualizar stock
    const { rows: prevRows } = await client.query(`SELECT estado FROM compras WHERE id = $1`, [id]);
    if (!prevRows[0]) throw new Error("Compra no encontrada");
    const estadoAnterior = prevRows[0].estado;

    let subtotal = 0;
    let total = 0;

    if (detalle && detalle.length > 0) {
      // Eliminar detalle anterior
      await client.query(`DELETE FROM compra_detalle WHERE compra_id = $1`, [id]);

      for (const item of detalle) {
        const itemSubtotal = item.cantidad * item.precio_unitario;
        subtotal += itemSubtotal;
        await client.query(
          `INSERT INTO compra_detalle (compra_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.producto_id, item.cantidad, item.precio_unitario, itemSubtotal]
        );
      }
      total = subtotal;
    }

    const { rows } = await client.query(
      `UPDATE compras SET
         proveedor_id  = COALESCE($1, proveedor_id),
         fecha         = COALESCE($2, fecha),
         metodo_pago   = COALESCE($3, metodo_pago),
         estado        = COALESCE($4, estado),
         notas         = COALESCE($5, notas),
         subtotal      = CASE WHEN $6 > 0 THEN $6 ELSE subtotal END,
         total         = CASE WHEN $7 > 0 THEN $7 ELSE total END
       WHERE id = $8
       RETURNING *`,
      [proveedor_id, fecha, metodo_pago, estado, notas, subtotal, total, id]
    );

    // Actualizar stock si la compra pasa a "recibida"
    if (estado === "recibida" && estadoAnterior !== "recibida") {
      const { rows: detalleRows } = await client.query(
        `SELECT producto_id, cantidad FROM compra_detalle WHERE compra_id = $1`, [id]
      );
      for (const item of detalleRows) {
        const { rows: stockRows } = await client.query(
          `SELECT stock_actual FROM productos WHERE id = $1`, [item.producto_id]
        );
        const stockAnterior = stockRows[0]?.stock_actual || 0;
        const stockNuevo = stockAnterior + item.cantidad;

        await client.query(
          `UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2`,
          [item.cantidad, item.producto_id]
        );

        // ← Registrar movimiento
        await client.query(
          `INSERT INTO movimientos_inventario
       (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
       VALUES ($1, 'entrada', $2, $3, $4, $6, NOW())`,
          [item.producto_id, item.cantidad, stockAnterior, stockNuevo,
            `Compra recibida`]
        );
      }
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const deleteCompra = async (id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM compra_detalle WHERE compra_id = $1`, [id]);
    const { rows } = await client.query(`DELETE FROM compras WHERE id = $1 RETURNING *`, [id]);
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── ESTADÍSTICAS ────────────────────────────────────────────────────────────

export const getEstadisticasCompras = async () => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                        AS total_compras,
      COALESCE(SUM(total), 0)                        AS monto_total,
      COALESCE(SUM(CASE WHEN estado='pendiente'  THEN 1 ELSE 0 END), 0) AS pendientes,
      COALESCE(SUM(CASE WHEN estado='recibida'   THEN 1 ELSE 0 END), 0) AS recibidas,
      COALESCE(SUM(CASE WHEN estado='cancelada'  THEN 1 ELSE 0 END), 0) AS canceladas,
      COALESCE(SUM(CASE WHEN fecha >= DATE_TRUNC('month', CURRENT_DATE) THEN total ELSE 0 END), 0) AS total_mes_actual
    FROM compras
  `);
  return rows[0];
};