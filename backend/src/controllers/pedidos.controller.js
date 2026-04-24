import * as service from "../services/pedidos.service.js";

export const getPedidos = async (req, res) => {
  try {
    const data = await service.obtenerPedidos();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDetalle = async (req, res) => {
  try {
    const data = await service.obtenerDetallePedido(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPedido = async (req, res) => {
  try {
    const data = await service.crearPedido(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePedido = async (req, res) => {
  try {
    const data = await service.actualizarPedido(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEstado = async (req, res) => {
  try {
    const data = await service.cambiarEstadoPedido(req.params.id, req.body.estado);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePedido = async (req, res) => {
  try {
    await service.eliminarPedido(req.params.id);
    res.json({ msg: "Pedido eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};