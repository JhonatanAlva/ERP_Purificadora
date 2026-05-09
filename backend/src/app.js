import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import ventasRoutes from "./routes/ventas.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import comprasRoutes from "./routes/compras.routes.js";
import repartoRoutes from "./routes/reparto.routes.js";
import creditosRoutes from "./routes/creditos.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";

const app = express();

// ─── FIX 4: Helmet — oculta headers que revelan tecnología ───────────────────
app.use(helmet());

// ─── FIX 3: CORS restringido a orígenes permitidos ───────────────────────────
const origenesPermitidos = (process.env.CORS_ORIGINS || "http://localhost:5174")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, apps móviles, mismo servidor)
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido → ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── FIX 5: Rate limiting global — protección básica contra flood ─────────────
// 200 requests por IP cada 15 minutos para rutas generales
const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Demasiadas peticiones. Intenta en 15 minutos." },
});

// 10 intentos de login por IP cada 15 minutos — antifuerza bruta
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Demasiados intentos de login. Intenta en 15 minutos." },
});

app.use(limitadorGeneral);

// ─── Body parser ──────────────────────────────────────────────────────────────
// Limitar tamaño del body para evitar ataques de payload grande
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// ─── Health check (sin autenticación) ────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ message: "API funcionando correctamente" });
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use("/api/auth", limitadorLogin, authRoutes);   // rate limit más estricto en login
app.use("/api/clientes", clientesRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/reparto", repartoRoutes);
app.use("/api/creditos", creditosRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/usuarios", usuariosRoutes);

// ─── Handler global de errores (última línea antes de export) ─────────────────
app.use((err, req, res, next) => {
  // Error de CORS
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ ok: false, message: err.message });
  }
  // Cualquier otro error no capturado
  console.error("[ERROR GLOBAL]", err.message);
  res.status(500).json({ ok: false, message: "Error interno del servidor" });
});

export default app;