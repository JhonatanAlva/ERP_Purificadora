import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
  withCredentials: true, // envía la cookie httpOnly automáticamente en cada request
});

export default api;