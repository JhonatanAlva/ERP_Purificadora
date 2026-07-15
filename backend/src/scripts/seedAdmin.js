import crypto from "crypto";
import dotenv from "dotenv";
import { pool } from "../config/db.js";
import { hashPassword } from "../services/auth.service.js";

dotenv.config();

// Crea el primer superadmin si no existe ninguno.
// Uso:
//   ADMIN_EMAIL=admin@purificadora.com ADMIN_PASSWORD=algo-fuerte npm run seed:admin
// Si no se pasa ADMIN_PASSWORD, se genera una aleatoria y se imprime una sola vez.
const run = async () => {
  const email = process.env.ADMIN_EMAIL || "admin@purificadora.com";
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

  const { rows: existentes } = await pool.query(
    "SELECT id FROM usuarios WHERE rol = 'superadmin' LIMIT 1"
  );

  if (existentes.length > 0) {
    console.log("Ya existe al menos un superadmin. No se creó ninguno nuevo.");
    await pool.end();
    return;
  }

  const hash = await hashPassword(password);

  await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, activo)
     VALUES ('Admin', $1, $2, 'superadmin', true)`,
    [email.toLowerCase().trim(), hash]
  );

  console.log("Superadmin creado:");
  console.log(`  email:    ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  password: ${password}  (guárdala ahora, no se volverá a mostrar)`);
  }

  await pool.end();
};

run().catch((err) => {
  console.error("Error al crear superadmin:", err.message);
  process.exit(1);
});
