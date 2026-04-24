import { loginService } from "../services/auth.service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await loginService(email, password);
    res.json(data);
  } catch (error) {
    const status = error.message.includes("no encontrado") || 
                   error.message.includes("incorrecta") ? 401 : 500;
    res.status(status).json({ message: error.message });
  }
};