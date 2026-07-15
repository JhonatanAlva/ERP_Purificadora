import * as service from "../services/pedidos.service.js";

const esUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const err = (res, status, msg) =>
  res.status(status).json({ ok: false, message: msg });

const ESTADOS_VALIDOS = ["pendiente", "en_proceso", "entregado", "cancelado"];

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
    if (!esUUID(req.params.id)) return err(res, 400, "ID de pedido no válido");
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
    if (!esUUID(req.params.id)) return err(res, 400, "ID de pedido no válido");
    const data = await service.actualizarPedido(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEstado = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID de pedido no válido");
    if (!ESTADOS_VALIDOS.includes(req.body.estado)) {
      return err(res, 400, `estado debe ser: ${ESTADOS_VALIDOS.join(", ")}`);
    }
    const data = await service.cambiarEstadoPedido(req.params.id, req.body.estado);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePedido = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) return err(res, 400, "ID de pedido no válido");
    await service.eliminarPedido(req.params.id);
    res.json({ msg: "Pedido eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
