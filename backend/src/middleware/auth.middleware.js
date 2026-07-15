import jwt from "jsonwebtoken";

export const verificarToken = (req, res, next) => {
  try {
    // Leer desde cookie httpOnly en vez de header
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol } — lo que firmaste en el JWT
    next();
  } catch (error) {
    // Limpiar cookie inválida o expirada
    res.clearCookie("token", { path: "/" });
    return res.status(401).json({ ok: false, message: "Sesión expirada" });
  }
};

// Requiere rol admin o superadmin — para operaciones destructivas/reversiones
// (eliminar, cancelar, cerrar) que no deben quedar en manos de cualquier usuario.
export const requireAdmin = (req, res, next) => {
  if (!["admin", "superadmin"].includes(req.user?.rol)) {
    return res.status(403).json({ ok: false, message: "Acción no permitida para tu rol" });
  }
  next();
};