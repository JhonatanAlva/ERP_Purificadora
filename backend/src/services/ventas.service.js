import { pool } from "../config/db.js";

// =========================
// LISTAR VENTAS
// =========================
export const getVentas = async () => {
  const { rows } = await pool.query(`
    SELECT 
      v.*,
      TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
      c.nombre AS cliente_nombre
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    ORDER BY v.fecha DESC
  `);
  return rows;
};

// =========================
// DETALLE DE VENTA
// =========================
export const getVentaDetalle = async (id) => {
  const ventaRes = await pool.query(
    `SELECT v.*,
            TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
            c.nombre AS cliente_nombre
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.id = $1`,
    [id]
  );

  const detalleRes = await pool.query(
    `SELECT vd.*, p.nombre
     FROM venta_detalle vd
     JOIN productos p ON p.id = vd.producto_id
     WHERE vd.venta_id = $1`,
    [id]
  );

  return {
    venta: ventaRes.rows[0],
    items: detalleRes.rows
  };
};

// =========================
// CREAR VENTA
// =========================
export const crearVenta = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      cliente_id,
      items,
      subtotal,
      descuento = 0,
      total,
      metodo_pago,
      tipo_venta,
      estado,
      ruta_id,
      notas,
      // FIX: recibir fecha desde el frontend en lugar de usar NOW()
      fecha,
    } = data;

    // =========================
    // VALIDACIONES GENERALES
    // =========================
    if (!items || items.length === 0) {
      throw new Error("La venta debe tener al menos un producto");
    }
    if (total < 0) {
      throw new Error("El total no puede ser negativo");
    }
    if (metodo_pago === "credito" && !cliente_id) {
      throw new Error("Venta a crédito requiere cliente");
    }

    const folio = `V-${Date.now()}`;

    // FIX FECHA: usar la fecha del form (YYYY-MM-DD) directamente
    // Si no viene fecha, usar CURRENT_DATE (hora local del servidor)
    const fechaVenta = fecha || null;

    // =========================
    // INSERTAR VENTA
    // =========================
    const ventaRes = await client.query(
      `INSERT INTO ventas 
       (folio, cliente_id, fecha, subtotal, descuento, total, metodo_pago, tipo_venta, estado, ruta_id, notas)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        folio,
        cliente_id  || null,
        fechaVenta,
        Number(subtotal)  || 0,
        Number(descuento) || 0,
        Number(total)     || 0,
        metodo_pago,
        tipo_venta,
        estado,
        ruta_id || null,
        notas   || ""
      ]
    );

    const venta = ventaRes.rows[0];

    // =========================
    // DETALLE + INVENTARIO
    // =========================
    for (const item of items) {
      const prodRes = await client.query(
        "SELECT * FROM productos WHERE id = $1 FOR UPDATE",
        [item.producto_id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Producto no encontrado (id: ${item.producto_id})`);
      }

      const producto      = prodRes.rows[0];
      const stockAnterior = producto.stock_actual;

      if (stockAnterior < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${stockAnterior}, solicitado: ${item.cantidad}`
        );
      }

      const subtotalItem = item.precio * item.cantidad;

      await client.query(
        `INSERT INTO venta_detalle
         (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta.id, item.producto_id, item.cantidad, item.precio, subtotalItem]
      );

      const updateRes = await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual - $1
         WHERE id = $2 AND stock_actual >= $1
         RETURNING stock_actual`,
        [item.cantidad, item.producto_id]
      );

      if (updateRes.rowCount === 0) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}" (conflicto concurrente)`
        );
      }

      const nuevoStock = updateRes.rows[0].stock_actual;

      await client.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
         VALUES ($1, 'salida', $2, $3, $4, 'venta', NOW())`,
        [item.producto_id, item.cantidad, stockAnterior, nuevoStock]
      );
    }

    

    // =========================
    // CRÉDITO (SI APLICA)
    // FIX: saldo_actual = total (no 0), estado = 'pendiente', incluir fecha_inicio
    // =========================
    if (metodo_pago === "credito") {
      await client.query(
        `INSERT INTO creditos
           (venta_id, cliente_id, monto_total, saldo_actual, estado, fecha_inicio, created_at)
         VALUES ($1, $2, $3, $4, 'pendiente', COALESCE($5::date, CURRENT_DATE), NOW())`,
        [venta.id, cliente_id, Number(total), Number(total), fechaVenta]
      );
    }

    await client.query("COMMIT");
    return venta;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// =========================
// CANCELAR VENTA
// =========================
export const cancelarVenta = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ventaRes = await client.query(
      "SELECT * FROM ventas WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (ventaRes.rows.length === 0) throw new Error("Venta no encontrada");

    const venta = ventaRes.rows[0];
    if (venta.estado === "cancelada") throw new Error("La venta ya está cancelada");

    const itemsRes = await client.query(
      "SELECT * FROM venta_detalle WHERE venta_id = $1",
      [id]
    );

    for (const item of itemsRes.rows) {
      const prodRes = await client.query(
        "SELECT * FROM productos WHERE id = $1 FOR UPDATE",
        [item.producto_id]
      );

      if (prodRes.rows.length === 0) continue;

      const stockAnterior = prodRes.rows[0].stock_actual;

      const updateRes = await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual + $1
         WHERE id = $2
         RETURNING stock_actual`,
        [item.cantidad, item.producto_id]
      );

      const nuevoStock = updateRes.rows[0].stock_actual;

      await client.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
         VALUES ($1, 'entrada', $2, $3, $4, 'cancelacion_venta', NOW())`,
        [item.producto_id, item.cantidad, stockAnterior, nuevoStock]
      );
    }

    await client.query(
      "UPDATE ventas SET estado = 'cancelada' WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");
    return { ok: true };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};