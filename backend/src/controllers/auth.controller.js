import { loginService } from "../services/auth.service.js";

const esProd = process.env.NODE_ENV === "production";

const cookieOpts = {
  httpOnly: true,
  secure: esProd,
  sameSite: esProd ? "none" : "lax",
  path: "/",
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginService(email, password);

    // Limpiar sesión anterior antes de crear la nueva
    res.clearCookie("token", cookieOpts);

    res.cookie("token", token, {
      ...cookieOpts,
      maxAge: 8 * 60 * 60 * 1000, // 8h
    });

    res.json({
      ok: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error) {
    const status = error.message.includes("Datos Incorrectos") ? 401 : 500;
    res.status(status).json({ ok: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", cookieOpts);
  res.json({ ok: true, message: "Sesión cerrada" });
};

export const getMe = (req, res) => {
  res.json({ id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
};