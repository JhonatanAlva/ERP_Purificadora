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