import { pool } from "../config/db.js";

// =========================
// LISTAR VENTAS
// =========================
export const getVentas = async () => {
  const { rows } = await pool.query(`
    SELECT 
      v.*,
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
    `SELECT v.*, c.nombre AS cliente_nombre
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
      notas
    } = data;

    // =========================
    // VALIDACIONES
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

    // =========================
    // CREAR VENTA
    // =========================
    const ventaRes = await client.query(
      `INSERT INTO ventas 
      (folio, cliente_id, fecha, subtotal, descuento, total, metodo_pago, tipo_venta, estado, ruta_id, notas)
      VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        folio,
        cliente_id || null,
        Number(subtotal) || 0,
        Number(descuento) || 0,
        Number(total) || 0,
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
    for (const item of items) {

      // 🔍 VALIDAR PRODUCTO
      const prodRes = await client.query(
        "SELECT * FROM productos WHERE id = $1",
        [item.producto_id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const producto = prodRes.rows[0];

      // 🔥 VALIDAR STOCK
      if (producto.stock_actual < item.cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}`);
      }

      const subtotalItem = item.precio * item.cantidad;

      // INSERT DETALLE
      await client.query(
        `INSERT INTO venta_detalle
        (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          venta.id,
          item.producto_id,
          item.cantidad,
          item.precio,
          subtotalItem
        ]
      );

      const nuevoStock = producto.stock_actual - item.cantidad;

      // ACTUALIZAR STOCK
      await client.query(
        `UPDATE productos
         SET stock_actual = $1
         WHERE id = $2`,
        [nuevoStock, item.producto_id]
      );

      // MOVIMIENTO INVENTARIO (MISMO ESTILO QUE INVENTARIO 🔥)
      await client.query(
        `INSERT INTO movimientos_inventario
        (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
        VALUES ($1,'salida',$2,$3,$4,'venta',NOW())`,
        [
          item.producto_id,
          item.cantidad,
          producto.stock_actual,
          nuevoStock
        ]
      );
    }

    // =========================
    // CRÉDITO (SI APLICA)
    // =========================
    if (metodo_pago === "credito") {
      await client.query(
        `INSERT INTO creditos
        (venta_id, cliente_id, monto_total, saldo_actual, estado, created_at)
        VALUES ($1,$2,$3,$4,'pendiente',NOW())`,
        [
          venta.id,
          cliente_id,
          total,
          total
        ]
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