import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

const ROLES_VALIDOS = ["superadmin", "admin", "usuario"];
const CAMPOS_SEGUROS = "id, nombre, email, rol, activo";

// ─── LISTAR ──────────────────────────────────────────────────────────────────

export const getAllUsuarios = async () => {
  const { rows } = await pool.query(
    `SELECT ${CAMPOS_SEGUROS},
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
     FROM usuarios
     ORDER BY created_at ASC`
  );
  return rows;
};

export const getUsuarioById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${CAMPOS_SEGUROS},
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
     FROM usuarios WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

// ─── CREAR ────────────────────────────────────────────────────────────────────

export const createUsuario = async ({ nombre, email, password, rol = "usuario" }) => {
  if (!ROLES_VALIDOS.includes(rol)) throw new Error("Rol no válido");

  // Verificar email único
  const { rows: existe } = await pool.query(
    "SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)", [email]
  );
  if (existe.length > 0) throw new Error("Ya existe un usuario con ese correo");

  const hash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, activo)
     VALUES ($1, $2, $3, $4, true)
     RETURNING ${CAMPOS_SEGUROS}`,
    [nombre.trim(), email.toLowerCase().trim(), hash, rol]
  );
  return rows[0];
};

// ─── EDITAR ───────────────────────────────────────────────────────────────────

export const updateUsuario = async (id, { nombre, email, rol }) => {
  if (rol && !ROLES_VALIDOS.includes(rol)) throw new Error("Rol no válido");

  // Si cambia email, verificar que no esté en uso por otro usuario
  if (email) {
    const { rows } = await pool.query(
      "SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND id != $2",
      [email, id]
    );
    if (rows.length > 0) throw new Error("Ese correo ya está en uso");
  }

  const { rows } = await pool.query(
    `UPDATE usuarios SET
       nombre = COALESCE($1, nombre),
       email  = COALESCE(LOWER($2), email),
       rol    = COALESCE($3, rol)
     WHERE id = $4
     RETURNING ${CAMPOS_SEGUROS}`,
    [nombre?.trim() ?? null, email?.toLowerCase().trim() ?? null, rol ?? null, id]
  );
  if (!rows[0]) throw new Error("Usuario no encontrado");
  return rows[0];
};

// ─── CAMBIAR CONTRASEÑA ───────────────────────────────────────────────────────

export const cambiarPassword = async (id, { password_nuevo, password_actual, esSuperAdmin = false }) => {
  const { rows } = await pool.query(
    "SELECT id, password FROM usuarios WHERE id = $1", [id]
  );
  if (!rows[0]) throw new Error("Usuario no encontrado");

  // Si no es superadmin haciendo el reset, verificar contraseña actual
  if (!esSuperAdmin) {
    const valida = await bcrypt.compare(password_actual, rows[0].password);
    if (!valida) throw new Error("La contraseña actual es incorrecta");
  }

  if (!password_nuevo || password_nuevo.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }

  const hash = await bcrypt.hash(password_nuevo, 12);
  await pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [hash, id]);
  return { ok: true };
};

// ─── ACTIVAR / DESACTIVAR ─────────────────────────────────────────────────────

export const toggleActivo = async (id, requesterId) => {
  // No puede desactivarse a sí mismo
  if (id === requesterId) throw new Error("No puedes desactivar tu propia cuenta");

  const { rows } = await pool.query(
    `UPDATE usuarios SET activo = NOT activo WHERE id = $1
     RETURNING ${CAMPOS_SEGUROS}`,
    [id]
  );
  if (!rows[0]) throw new Error("Usuario no encontrado");
  return rows[0];
};

// ─── ELIMINAR ─────────────────────────────────────────────────────────────────

export const deleteUsuario = async (id, requesterId) => {
  if (id === requesterId) throw new Error("No puedes eliminar tu propia cuenta");
  const { rows } = await pool.query(
    "DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre", [id]
  );
  if (!rows[0]) throw new Error("Usuario no encontrado");
  return rows[0];
};

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────

export const getEstadisticas = async () => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                                            AS total,
      SUM(CASE WHEN activo   = true  THEN 1 ELSE 0 END)                  AS activos,
      SUM(CASE WHEN activo   = false THEN 1 ELSE 0 END)                  AS inactivos,
      SUM(CASE WHEN rol = 'superadmin' THEN 1 ELSE 0 END)                AS superadmins,
      SUM(CASE WHEN rol = 'admin'      THEN 1 ELSE 0 END)                AS admins,
      SUM(CASE WHEN rol = 'usuario'    THEN 1 ELSE 0 END)                AS usuarios
    FROM usuarios
  `);
  return rows[0];
};