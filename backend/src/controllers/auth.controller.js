import { loginService } from "../services/auth.service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginService(email, password);

    // Poner el token en httpOnly cookie — JS nunca lo ve
    res.cookie("token", token, {
      httpOnly: true,                              // JS no puede leerla
      secure: process.env.NODE_ENV === "production", // solo HTTPS en prod
      sameSite: "strict",                          // protege contra CSRF
      maxAge: 8 * 60 * 60 * 1000,                 // 8h — igual que el JWT
      path: "/",
    });

    // Solo devolver datos mínimos del usuario (nunca el token en el body)
    res.json({
      ok: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        // email solo si realmente lo necesitas en el frontend
      },
    });
  } catch (error) {
    const status = error.message.includes("Datos Incorrectos") ? 401 : 500;
    res.status(status).json({ ok: false, message: error.message });
  }
};

// Agregar ruta de logout para limpiar la cookie desde el servidor
export const logout = async (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true, message: "Sesión cerrada" });
};

// Ruta para que el frontend verifique si la cookie es válida y obtener datos del usuario
export const getMe = (req, res) => {
  // req.user solo tiene { id, rol } del JWT
  // Necesitas devolver nombre también — opciones:
  
  res.json({ id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });

};