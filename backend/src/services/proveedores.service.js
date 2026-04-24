import {pool} from "../config/db.js";

export const getAll = async () => {
    const { rows } = await pool.query(
        "SELECT * FROM proveedores ORDER BY nombre ASC"
    );
    return rows;
};

export const getById = async (id) => {
    const { rows } = await pool.query(
        "SELECT * FROM proveedores WHERE id = $1",
        [id]
    );
    return rows[0] || null;
};

export const create = async (data) => {
    const { nombre, contacto, telefono, email, direccion, productos_suministra, notas, activo } = data;
    const { rows } = await pool.query(
        `INSERT INTO proveedores 
      (id, nombre, contacto, telefono, email, direccion, productos_suministra, notas, activo)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [nombre, contacto ?? null, telefono ?? null, email ?? null,
            direccion ?? null, productos_suministra ?? null, notas ?? null, activo ?? true]
    );
    return rows[0];
};

export const update = async (id, data) => {
    const { nombre, contacto, telefono, email, direccion, productos_suministra, notas, activo } = data;
    const { rows } = await pool.query(
        `UPDATE proveedores SET
      nombre               = $1,
      contacto             = $2,
      telefono             = $3,
      email                = $4,
      direccion            = $5,
      productos_suministra = $6,
      notas                = $7,
      activo               = $8
     WHERE id = $9
     RETURNING *`,
        [nombre, contacto ?? null, telefono ?? null, email ?? null,
            direccion ?? null, productos_suministra ?? null, notas ?? null, activo ?? true, id]
    );
    return rows[0] || null;
};

export const remove = async (id) => {
    const { rowCount } = await pool.query(
        "DELETE FROM proveedores WHERE id = $1", [id]
    );
    return rowCount > 0;
};