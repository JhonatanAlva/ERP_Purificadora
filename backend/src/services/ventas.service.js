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
      descuento = 0,
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
    if (metodo_pago === "credito" && !cliente_id) {
      throw new Error("Venta a crédito requiere cliente");
    }

    const folio = `V-${Date.now()}`;

    // FIX FECHA: usar la fecha del form (YYYY-MM-DD) directamente
    // Si no viene fecha, usar CURRENT_DATE (hora local del servidor)
    const fechaVenta = fecha || null;

    // =========================
    // BLOQUEAR PRODUCTOS Y CALCULAR PRECIOS DESDE LA BASE DE DATOS
    // El precio nunca se toma del cliente: evita que un usuario manipule
    // el precio de venta enviando un `item.precio` distinto al catálogo.
    // =========================
    const itemsConProducto = [];
    let subtotalCalculado = 0;

    for (const item of items) {
      const prodRes = await client.query(
        "SELECT * FROM productos WHERE id = $1 FOR UPDATE",
        [item.producto_id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Producto no encontrado (id: ${item.producto_id})`);
      }

      const producto = prodRes.rows[0];
      const stockAnterior = producto.stock_actual;

      if (stockAnterior < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${stockAnterior}, solicitado: ${item.cantidad}`
        );
      }

      const precio = Number(producto.precio_venta);
      const subtotalItem = precio * item.cantidad;
      subtotalCalculado += subtotalItem;

      itemsConProducto.push({ producto, cantidad: item.cantidad, precio, subtotalItem, stockAnterior });
    }

    const descuentoNum = Number(descuento) || 0;
    if (descuentoNum < 0 || descuentoNum > subtotalCalculado) {
      throw new Error("El descuento no puede ser negativo ni mayor al subtotal");
    }
    const totalCalculado = +(subtotalCalculado - descuentoNum).toFixed(2);

    // =========================
    // INSERTAR VENTA (con montos calculados en el servidor)
    // =========================
    const ventaRes = await client.query(
      `INSERT INTO ventas
       (folio, cliente_id, fecha, subtotal, descuento, total, metodo_pago, tipo_venta, estado, ruta_id, notas)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        folio,
        cliente_id || null,
        fechaVenta,
        subtotalCalculado,
        descuentoNum,
        totalCalculado,
        metodo_pago,
        tipo_venta,
        estado,
        ruta_id || null,
        notas || ""
      ]
    );

    const venta = ventaRes.rows[0];

    // =========================
    // DETALLE + INVENTARIO
    // =========================
    for (const { producto, cantidad, precio, subtotalItem, stockAnterior } of itemsConProducto) {
      await client.query(
        `INSERT INTO venta_detalle
         (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta.id, producto.id, cantidad, precio, subtotalItem]
      );

      const updateRes = await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual - $1
         WHERE id = $2 AND stock_actual >= $1
         RETURNING stock_actual`,
        [cantidad, producto.id]
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
        [producto.id, cantidad, stockAnterior, nuevoStock]
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
        [venta.id, cliente_id, totalCalculado, totalCalculado, fechaVenta]
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

    // =========================================
    // OBTENER VENTA
    // =========================================
    const ventaRes = await client.query(
      "SELECT * FROM ventas WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (ventaRes.rows.length === 0) {
      throw new Error("Venta no encontrada");
    }

    const venta = ventaRes.rows[0];

    if (venta.estado === "cancelada") {
      throw new Error("La venta ya está cancelada");
    }

    // =========================================
    // OBTENER DETALLE
    // =========================================
    const itemsRes = await client.query(
      "SELECT * FROM venta_detalle WHERE venta_id = $1",
      [id]
    );

    // =========================================
    // RESTAURAR STOCK
    // =========================================
    for (const item of itemsRes.rows) {

      const prodRes = await client.query(
        "SELECT * FROM productos WHERE id = $1 FOR UPDATE",
        [item.producto_id]
      );

      if (prodRes.rows.length === 0) continue;

      const producto = prodRes.rows[0];

      const stockAnterior =
        producto.stock_actual;

      const updateRes = await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual + $1
         WHERE id = $2
         RETURNING stock_actual`,
        [
          item.cantidad,
          item.producto_id
        ]
      );

      const nuevoStock =
        updateRes.rows[0].stock_actual;

      // =========================================
      // MOVIMIENTO INVENTARIO
      // =========================================
      await client.query(
        `INSERT INTO movimientos_inventario
        (
          producto_id,
          tipo_movimiento,
          cantidad,
          stock_anterior,
          stock_nuevo,
          motivo,
          fecha
        )
        VALUES
        (
          $1,
          'entrada',
          $2,
          $3,
          $4,
          'cancelacion_venta',
          NOW()
        )`,
        [
          item.producto_id,
          item.cantidad,
          stockAnterior,
          nuevoStock
        ]
      );
    }

    // =========================================
    // CANCELAR VENTA
    // =========================================
    await client.query(
      `UPDATE ventas
       SET estado = 'cancelada'
       WHERE id = $1`,
      [id]
    );

    // =========================================
    // CANCELAR CRÉDITO RELACIONADO
    // =========================================
    await client.query(
      `UPDATE creditos
       SET estado = 'cancelado'
       WHERE venta_id = $1
       AND estado != 'pagado'`,
      [id]
    );

    // =========================================
    // FINALIZAR
    // =========================================
    await client.query("COMMIT");

    return { ok: true };

  } catch (error) {

    await client.query("ROLLBACK");
    throw error;

  } finally {

    client.release();

  }

};