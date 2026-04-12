import * as ventasService from "../services/ventas.service.js";

export const getVentas = async (req, res) => {
  try {
    const data = await ventasService.getVentas();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVentaDetalle = async (req, res) => {
  try {
    const data = await ventasService.getVentaDetalle(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearVenta = async (req, res) => {
  try {
    const data = await ventasService.crearVenta(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelarVenta = async (req, res) => {
  try {
    await ventasService.cancelarVenta(req.params.id);
    res.json({ message: "Venta cancelada" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};