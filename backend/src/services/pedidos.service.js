import { pool } from "../config/db.js";

const limpiarFecha = (fecha) => {
  if (!fecha) return null;
  return fecha.split("T")[0];
};

export const obtenerPedidos = async () => {
  const result = await pool.query(`
    SELECT p.*, c.nombre AS cliente_nombre
    FROM pedidos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.fecha_pedido DESC
  `);
  return result.rows;
};

export const obtenerDetallePedido = async (pedidoId) => {
  const result = await pool.query(`
    SELECT pd.*, pr.nombre AS producto_nombre, pr.precio_venta AS precio_unitario
    FROM pedido_detalle pd
    LEFT JOIN productos pr ON pr.id = pd.producto_id
    WHERE pd.pedido_id = $1
  `, [pedidoId]);
  return result.rows;
};

export const crearPedido = async (data) => {
  const { cliente_id, fecha_pedido, fecha_entrega, estado, direccion_entrega, zona, notas, items } = data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const folio = `P-${Date.now().toString().slice(-6)}`;

    const pedidoRes = await client.query(`
      INSERT INTO pedidos (folio, cliente_id, fecha_pedido, fecha_entrega, estado, direccion_entrega, zona, notas, total_estimado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [
      folio,
      cliente_id || null,
      limpiarFecha(fecha_pedido),
      limpiarFecha(fecha_entrega),
      estado || "pendiente",
      direccion_entrega || "",
      zona || "",
      notas || "",
      0
    ]);

    const pedido = pedidoRes.rows[0];
    let total = 0;

    for (const item of items) {
      const prod = await client.query(
        "SELECT precio_venta, stock_actual, nombre FROM productos WHERE id = $1",
        [item.producto_id]
      );
      if (prod.rows.length === 0) throw new Error(`Producto no encontrado`);

      // Solo validar que hay stock suficiente, NO descontarlo todavía
      if (prod.rows[0].stock_actual < item.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.rows[0].nombre}". Disponible: ${prod.rows[0].stock_actual}`);
      }

      const precio = prod.rows[0].precio_venta;
      total += precio * item.cantidad;

      await client.query(`
        INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad)
        VALUES ($1,$2,$3)
      `, [pedido.id, item.producto_id, item.cantidad]);
    }

    await client.query(`UPDATE pedidos SET total_estimado = $1 WHERE id = $2`, [total, pedido.id]);
    await client.query("COMMIT");
    return { ...pedido, total_estimado: total };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const actualizarPedido = async (id, data) => {
  const {
    cliente_id,
    fecha_pedido,
    fecha_entrega,
    direccion_entrega,
    zona,
    notas,
    items
  } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // IMPORTANTE: ya NO actualizamos estado aquí
    await client.query(`
      UPDATE pedidos SET
        cliente_id = $1,
        fecha_pedido = $2,
        fecha_entrega = $3,
        direccion_entrega = $4,
        zona = $5,
        notas = $6
      WHERE id = $7
    `, [
      cliente_id || null,
      limpiarFecha(fecha_pedido),
      limpiarFecha(fecha_entrega),
      direccion_entrega || "",
      zona || "",
      notas || "",
      id
    ]);

    // =============================
    // DETALLE
    // =============================
    if (items && items.length > 0) {
      await client.query(
        "DELETE FROM pedido_detalle WHERE pedido_id = $1",
        [id]
      );

      let total = 0;

      for (const item of items) {
        const prod = await client.query(
          "SELECT precio_venta, nombre FROM productos WHERE id = $1",
          [item.producto_id]
        );

        if (prod.rows.length === 0) {
          throw new Error(`Producto no encontrado`);
        }

        const precio = prod.rows[0].precio_venta;
        total += precio * item.cantidad;

        await client.query(`
          INSERT INTO pedido_detalle
          (pedido_id, producto_id, cantidad)
          VALUES ($1,$2,$3)
        `, [id, item.producto_id, item.cantidad]);
      }

      await client.query(`
        UPDATE pedidos SET total_estimado = $1 WHERE id = $2
      `, [total, id]);
    }

    await client.query("COMMIT");

    const updated = await pool.query(
      "SELECT * FROM pedidos WHERE id = $1",
      [id]
    );

    return updated.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// =============================
// CAMBIAR ESTADO — lógica de stock
// =============================
export const cambiarEstadoPedido = async (id, nuevoEstado) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Obtener estado actual del pedido
    const pedidoRes = await client.query(
      "SELECT * FROM pedidos WHERE id = $1", [id]
    );
    if (pedidoRes.rows.length === 0) throw new Error("Pedido no encontrado");

    const estadoActual = pedidoRes.rows[0].estado?.trim().toLowerCase();
    const estadoNuevo = nuevoEstado?.trim().toLowerCase();

    // Obtener items del pedido
    const itemsRes = await client.query(
      "SELECT * FROM pedido_detalle WHERE pedido_id = $1", [id]
    );
    const items = itemsRes.rows;

    // CASO 1: pendiente/en_proceso → entregado = DESCONTAR STOCK
    if (estadoNuevo === "entregado" && estadoActual !== "entregado") {
      for (const item of items) {
        const prodRes = await client.query(
          "SELECT * FROM productos WHERE id = $1", [item.producto_id]
        );
        if (prodRes.rows.length === 0) continue;
        const producto = prodRes.rows[0];

        if (producto.stock_actual < item.cantidad) {
          throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual}`);
        }

        const nuevoStock = producto.stock_actual - item.cantidad;

        await client.query(
          "UPDATE productos SET stock_actual = $1 WHERE id = $2",
          [nuevoStock, item.producto_id]
        );

        await client.query(`
          INSERT INTO movimientos_inventario
          (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
          VALUES ($1,'salida',$2,$3,$4,'pedido_entregado',NOW())
        `, [item.producto_id, item.cantidad, producto.stock_actual, nuevoStock]);
      }
    }

    // CASO 2: entregado → cancelado = RESTAURAR STOCK
    if (estadoNuevo === "cancelado" && estadoActual === "entregado") {
      for (const item of items) {
        const prodRes = await client.query(
          "SELECT * FROM productos WHERE id = $1", [item.producto_id]
        );
        if (prodRes.rows.length === 0) continue;
        const producto = prodRes.rows[0];
        const nuevoStock = producto.stock_actual + item.cantidad;

        await client.query(
          "UPDATE productos SET stock_actual = $1 WHERE id = $2",
          [nuevoStock, item.producto_id]
        );

        await client.query(`
          INSERT INTO movimientos_inventario
          (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
          VALUES ($1,'entrada',$2,$3,$4,'cancelacion_pedido',NOW())
        `, [item.producto_id, item.cantidad, producto.stock_actual, nuevoStock]);
      }
    }

    // Actualizar estado
    const result = await client.query(`
      UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *
    `, [nuevoEstado, id]);

    await client.query("COMMIT");
    return result.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const eliminarPedido = async (id) => {
  await pool.query("DELETE FROM pedido_detalle WHERE pedido_id = $1", [id]);
  await pool.query("DELETE FROM pedidos WHERE id = $1", [id]);
};