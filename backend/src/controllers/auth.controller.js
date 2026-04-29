import { loginService } from "../services/auth.service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await loginService(email, password);
    res.json(data);
  } catch (error) {
    const status = error.message.includes("Datos Incorrectos") ? 401 : 500;
    res.status(status).json({ message: error.message });
  }
};