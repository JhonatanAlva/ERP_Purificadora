import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginService = async (email, password) => {
  // Seleccionar solo los campos necesarios, no SELECT *
  const result = await pool.query(
    "SELECT id, nombre, email, password, rol, activo FROM usuarios WHERE email = $1",
    [email]
  );

  // Mismo error si no existe o si está inactivo — no revela información
  if (result.rows.length === 0) {
    throw new Error("Datos Incorrectos");
  }

  const user = result.rows[0];

  // Verificar que el usuario esté activo antes de validar contraseña
  if (!user.activo) {
    throw new Error("Datos Incorrectos");
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new Error("Datos Incorrectos");
  }

  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  // Nunca devolver el hash de la contraseña
  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    },
  };
};

// ── Utilidad para crear usuarios con hash seguro ──────────────────
// Usar esto siempre que se cree o actualice una contraseña
export const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, 12); // 12 rounds mínimo
};

// ── Verificar contraseña (reutilizable si se necesita en otros flujos) ──
export const verifyPassword = async (plain, hashed) => {
  return await bcrypt.compare(plain, hashed);
};