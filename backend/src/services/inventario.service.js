import { pool } from "../config/db.js";

// ================= PRODUCTOS

export const getProductos = async () => {
  const { rows } = await pool.query(`
    SELECT 
      id,
      nombre,
      tipo,
      descripcion,
      precio_venta,
      precio_costo,
      stock_actual,
      stock_minimo,
      unidad,
      activo::boolean AS activo
    FROM productos
    ORDER BY id DESC
  `);

  return rows;
};

export const createProducto = async (data) => {
  const existe = await pool.query(
    "SELECT 1 FROM productos WHERE LOWER(nombre) = LOWER($1)",
    [data.nombre]
  );

  if (existe.rows.length > 0) {
    throw new Error("Ya existe un producto con ese nombre");
  }
  if (data.precio_venta < 0 || data.precio_costo < 0) {
    throw new Error("Los precios no pueden ser negativos");
  }

  const query = `
    INSERT INTO productos
    (nombre, tipo, descripcion, precio_venta, precio_costo, stock_actual, stock_minimo, unidad, activo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `;

  const values = [
    data.nombre,
    data.tipo,
    data.descripcion || "",
    Number(data.precio_venta) || 0,
    Number(data.precio_costo) || 0,
    Number(data.stock_actual) || 0,
    Number(data.stock_minimo) || 10,
    data.unidad || "unidad",
    data.activo ?? true
  ];

  await pool.query(query, values);
};

export const updateProducto = async (id, data) => {
  const existe = await pool.query(
    "SELECT 1 FROM productos WHERE LOWER(nombre) = LOWER($1) AND id != $2",
    [data.nombre, id]
  );

  if (existe.rows.length > 0) {
    throw new Error("Nombre ya en uso por otro producto");
  }
  if (data.precio_venta < 0 || data.precio_costo < 0) {
    throw new Error("Los precios no pueden ser negativos");
  }

  const query = `
    UPDATE productos SET
    nombre=$1,
    tipo=$2,
    descripcion=$3,
    precio_venta=$4,
    precio_costo=$5,
    stock_actual=$6,
    stock_minimo=$7,
    unidad=$8,
    activo=$9
    WHERE id=$10
  `;

  const values = [
    data.nombre,
    data.tipo,
    data.descripcion || "",
    Number(data.precio_venta) || 0,
    Number(data.precio_costo) || 0,
    Number(data.stock_actual) || 0,
    Number(data.stock_minimo) || 10,
    data.unidad || "unidad",
    data.activo ?? true,
    id
  ];

  await pool.query(query, values);
};

export const deleteProducto = async (id) => {
  await pool.query(
    "UPDATE productos SET activo=false WHERE id=$1",
    [id]
  );
};

export const activarProducto = async (id) => {
  await pool.query(
    "UPDATE productos SET activo=true WHERE id=$1",
    [id]
  );
};

// ================= MOVIMIENTOS

export const getMovimientos = async () => {
  const { rows } = await pool.query(`
    SELECT m.*, p.nombre AS producto_nombre
    FROM movimientos_inventario m
    JOIN productos p ON p.id = m.producto_id
    ORDER BY m.id DESC
  `);

  return rows;
};

export const createMovimiento = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Obtener producto
    const { rows } = await client.query(
      "SELECT * FROM productos WHERE id=$1",
      [data.producto_id]
    );

    if (rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const producto = rows[0];
    let nuevoStock = producto.stock_actual;

    // 2. Calcular stock
    if (data.tipo_movimiento === "entrada") {
      nuevoStock += data.cantidad;
    } else if (data.tipo_movimiento === "salida") {
      nuevoStock -= data.cantidad;

      if (nuevoStock < 0) {
        throw new Error("Stock insuficiente");
      }
    }

    // 3. Actualizar stock
    await client.query(
      "UPDATE productos SET stock_actual=$1 WHERE id=$2",
      [nuevoStock, data.producto_id]
    );

    // 4. Guardar movimiento
    await client.query(
      `INSERT INTO movimientos_inventario
      (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        data.producto_id,
        data.tipo_movimiento,
        data.cantidad,
        producto.stock_actual,
        nuevoStock,
        data.motivo || ""
      ]
    );

    await client.query("COMMIT");

    return { message: "Movimiento realizado correctamente" };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};