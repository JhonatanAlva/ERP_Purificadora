import { pool } from "../config/db.js";

// 🔹 Obtener clientes
export const obtenerClientes = async ({
  page = 1,
  limit = 10,
  estado = "todos",
}) => {
  const offset = (page - 1) * limit;

  let where = "";

  if (estado === "activos") {
    where = "WHERE activo = true";
  } else if (estado === "inactivos") {
    where = "WHERE activo = false";
  }

  // 🔹 Datos
  const dataQuery = `
    SELECT * FROM clientes
    ${where}
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const dataResult = await pool.query(dataQuery, [limit, offset]);

  // 🔹 Total para paginación
  const countQuery = `
    SELECT COUNT(*) FROM clientes ${where}
  `;

  const countResult = await pool.query(countQuery);

  const total = parseInt(countResult.rows[0].count);

  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// 🔹 Crear cliente
export const crearCliente = async ({
  nombre,
  telefono,
  zona,
  direccion,
  tipo,
  garrafones_prestados,
  notas,
}) => {
  const result = await pool.query(
    `INSERT INTO clientes 
    (nombre, telefono, zona, direccion, tipo, garrafones_prestados, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      nombre,
      telefono || null,
      zona || null,
      direccion || null,
      tipo || "menudeo",
      garrafones_prestados || 0,
      notas || null,
    ],
  );

  return result.rows[0];
};

// 🔹 Actualizar cliente
export const actualizarCliente = async (id, data) => {
  const {
    nombre,
    telefono,
    zona,
    direccion,
    tipo,
    garrafones_prestados,
    notas,
    activo,
  } = data;

  const result = await pool.query(
    `UPDATE clientes SET
      nombre = COALESCE($1, nombre),
      telefono = COALESCE($2, telefono),
      zona = COALESCE($3, zona),
      direccion = COALESCE($4, direccion),
      tipo = COALESCE($5, tipo),
      garrafones_prestados = COALESCE($6, garrafones_prestados),
      notas = COALESCE($7, notas),
      activo = COALESCE($8, activo)
    WHERE id = $9
    RETURNING *`,
    [
      nombre,
      telefono,
      zona,
      direccion,
      tipo,
      garrafones_prestados,
      notas,
      activo,
      id,
    ],
  );

  return result.rows[0];
};

// 🔹 Desactivar cliente (soft delete)
export const eliminarCliente = async (id) => {
  await pool.query("UPDATE clientes SET activo = false WHERE id = $1", [id]);
};

export const obtenerClientesPaginados = async (page, limit) => {
  const offset = (page - 1) * limit;

  const data = await pool.query(
    `SELECT * FROM clientes 
     WHERE activo = true
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const total = await pool.query(
    "SELECT COUNT(*) FROM clientes WHERE activo = true",
  );

  return {
    clientes: data.rows,
    total: Number(total.rows[0].count),
  };
};
