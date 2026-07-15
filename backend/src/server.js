import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

// Falla rápido si el JWT_SECRET no existe o es demasiado débil para producción,
// en vez de arrancar silenciosamente con un secreto adivinable/vacío.
const esProd = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "";

if (!jwtSecret) {
  console.error("JWT_SECRET no está definido. Configúralo antes de arrancar el servidor.");
  process.exit(1);
}
if (esProd && jwtSecret.length < 32) {
  console.error("JWT_SECRET es demasiado corto para producción (mínimo 32 caracteres).");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});