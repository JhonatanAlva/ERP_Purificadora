import * as service from "../services/usuarios.service.js";

const esUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const err = (res, status, msg) =>
  res.status(status).json({ ok: false, message: msg });

// ── GET /api/usuarios ────────────────────────────────────────────────────────
export const getUsuarios = async (req, res) => {
  try {
    const data = await service.getAllUsuarios();
    res.json({ ok: true, data });
  } catch (e) {
    console.error("[getUsuarios]", e.message);
    res.status(500).json({ ok: false, message: "Error al obtener usuarios" });
  }
};

// ── GET /api/usuarios/:id ────────────────────────────────────────────────────
export const getUsuario = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID no válido");
    const u = await service.getUsuarioById(req.params.id);
    if (!u) return err(res, 404, "Usuario no encontrado");
    res.json({ ok: true, data: u });
  } catch (e) {
    console.error("[getUsuario]", e.message);
    res.status(500).json({ ok: false, message: "Error" });
  }
};

// ── POST /api/usuarios ───────────────────────────────────────────────────────
export const createUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre?.trim())    return err(res, 400, "El nombre es requerido");
    if (!email?.trim())     return err(res, 400, "El correo es requerido");
    if (!password?.trim())  return err(res, 400, "La contraseña es requerida");
    if (password.length < 6) return err(res, 400, "La contraseña debe tener al menos 6 caracteres");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err(res, 400, "Formato de correo no válido");

    const u = await service.createUsuario({ nombre, email, password, rol });
    res.status(201).json({ ok: true, data: u });
  } catch (e) {
    console.error("[createUsuario]", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
};

// ── PUT /api/usuarios/:id ────────────────────────────────────────────────────
export const updateUsuario = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID no válido");
    const { nombre, email, rol } = req.body;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err(res, 400, "Formato de correo no válido");

    const u = await service.updateUsuario(req.params.id, { nombre, email, rol });
    res.json({ ok: true, data: u });
  } catch (e) {
    console.error("[updateUsuario]", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
};

// ── PUT /api/usuarios/:id/password ───────────────────────────────────────────
export const cambiarPassword = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID no válido");

    const { password_nuevo, password_actual } = req.body;
    if (!password_nuevo) return err(res, 400, "La nueva contraseña es requerida");

    // El superadmin puede resetear sin saber la contraseña actual
    const esSuperAdmin = req.user?.rol === "superadmin" && req.user?.id !== req.params.id;

    await service.cambiarPassword(req.params.id, {
      password_nuevo,
      password_actual,
      esSuperAdmin,
    });
    res.json({ ok: true, message: "Contraseña actualizada" });
  } catch (e) {
    console.error("[cambiarPassword]", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
};

// ── PUT /api/usuarios/:id/toggle ─────────────────────────────────────────────
export const toggleActivo = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID no válido");
    const u = await service.toggleActivo(req.params.id, req.user.id);
    res.json({ ok: true, data: u, message: u.activo ? "Usuario activado" : "Usuario desactivado" });
  } catch (e) {
    console.error("[toggleActivo]", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
};

// ── DELETE /api/usuarios/:id ─────────────────────────────────────────────────
export const deleteUsuario = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID no válido");
    const u = await service.deleteUsuario(req.params.id, req.user.id);
    res.json({ ok: true, message: `Usuario "${u.nombre}" eliminado` });
  } catch (e) {
    console.error("[deleteUsuario]", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
};

// ── GET /api/usuarios/estadisticas ───────────────────────────────────────────
export const getEstadisticas = async (req, res) => {
  try {
    const data = await service.getEstadisticas();
    res.json({ ok: true, data });
  } catch (e) {
    console.error("[getEstadisticas]", e.message);
    res.status(500).json({ ok: false, message: "Error" });
  }
};