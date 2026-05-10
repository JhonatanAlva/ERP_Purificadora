import * as ventasService from "../services/ventas.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const esUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const err = (res, status, msg) =>
  res.status(status).json({ ok: false, message: msg });

// Whitelist de valores permitidos
const METODOS_PAGO  = ["efectivo", "transferencia", "tarjeta", "credito"];
const TIPOS_VENTA   = ["mostrador", "ruta", "pedido"];
const ESTADOS_VENTA = ["pagada", "pendiente"];

// Sanitizar string — elimina caracteres de control, limita longitud
const sanitizar = (str, maxLen = 500) =>
  typeof str === "string"
    ? str.replace(/[\x00-\x1F\x7F]/g, "").slice(0, maxLen).trim()
    : "";

// ─── GET /api/ventas ──────────────────────────────────────────────────────────
export const getVentas = async (req, res) => {
  try {
    const data = await ventasService.getVentas();
    // Devuelve array directo para mantener compatibilidad con el frontend existente
    res.json(data);
  } catch (error) {
    console.error("[getVentas]", error.message);
    res.status(500).json({ error: "Error al obtener ventas" });
  }
};

// ─── GET /api/ventas/:id ──────────────────────────────────────────────────────
export const getVentaDetalle = async (req, res) => {
  try {
    if (!esUUID(req.params.id)) {
      return err(res, 400, "ID de venta no válido");
    }
    const data = await ventasService.getVentaDetalle(req.params.id);
    if (!data?.venta) return err(res, 404, "Venta no encontrada");
    // Devuelve objeto directo para compatibilidad con el frontend existente
    res.json(data);
  } catch (error) {
    console.error("[getVentaDetalle]", error.message);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
};

// ─── POST /api/ventas ─────────────────────────────────────────────────────────
export const crearVenta = async (req, res) => {
  try {
    const {
      cliente_id, items, subtotal, descuento,
      total, metodo_pago, tipo_venta, estado,
      ruta_id, notas, fecha,
    } = req.body;

    // FIX 1: validaciones de entrada completas

    // Items requeridos
    if (!Array.isArray(items) || items.length === 0) {
      return err(res, 400, "La venta debe tener al menos un producto");
    }

    // Límite razonable de productos por venta
    if (items.length > 50) {
      return err(res, 400, "La venta no puede tener más de 50 productos");
    }

    // FIX 7: whitelist de metodo_pago
    if (!metodo_pago || !METODOS_PAGO.includes(metodo_pago)) {
      return err(res, 400, `metodo_pago debe ser: ${METODOS_PAGO.join(", ")}`);
    }

    // FIX 7: whitelist de tipo_venta
    if (!tipo_venta || !TIPOS_VENTA.includes(tipo_venta)) {
      return err(res, 400, `tipo_venta debe ser: ${TIPOS_VENTA.join(", ")}`);
    }

    // FIX 8: whitelist de estado
    const estadoFinal = metodo_pago === "credito"
      ? "pendiente"
      : (estado && ESTADOS_VENTA.includes(estado) ? estado : "pagada");

    // Validar totales numéricos y positivos
    const subtotalNum = parseFloat(subtotal);
    const totalNum    = parseFloat(total);
    const descuentoNum = parseFloat(descuento) || 0;

    if (isNaN(subtotalNum) || subtotalNum < 0) {
      return err(res, 400, "subtotal no válido");
    }
    if (isNaN(totalNum) || totalNum < 0) {
      return err(res, 400, "total no válido");
    }
    if (descuentoNum < 0) {
      return err(res, 400, "descuento no puede ser negativo");
    }

    // Validar cliente_id si viene
    if (cliente_id && !esUUID(cliente_id)) {
      return err(res, 400, "cliente_id no válido");
    }

    // Validar ruta_id si viene
    if (ruta_id && !esUUID(ruta_id)) {
      return err(res, 400, "ruta_id no válido");
    }

    // Validar formato de fecha si viene
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return err(res, 400, "fecha debe tener formato YYYY-MM-DD");
    }

    // Validar cada item del detalle
    for (const [i, item] of items.entries()) {
      if (!item.producto_id || !esUUID(item.producto_id)) {
        return err(res, 400, `Item ${i + 1}: producto_id no válido`);
      }
      const cantidad = parseInt(item.cantidad);
      const precio   = parseFloat(item.precio);
      if (!cantidad || cantidad <= 0 || cantidad > 9999) {
        return err(res, 400, `Item ${i + 1}: cantidad no válida`);
      }
      if (isNaN(precio) || precio < 0) {
        return err(res, 400, `Item ${i + 1}: precio no válido`);
      }
    }

    // FIX 6: sanitizar notas
    const notasSanitizadas = sanitizar(notas, 500);

    const data = await ventasService.crearVenta({
      cliente_id:  cliente_id  || null,
      items,
      subtotal:    subtotalNum,
      descuento:   descuentoNum,
      total:       totalNum,
      metodo_pago,
      tipo_venta,
      estado:      estadoFinal,
      ruta_id:     ruta_id || null,
      notas:       notasSanitizadas,
      fecha,
    });

    res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error("[crearVenta]", error.message);
    // FIX 2: mensajes de negocio se reenvían, errores internos se ocultan
    const esErrorNegocio = [
      "stock insuficiente",
      "requiere cliente",
      "producto no encontrado",
      "al menos un producto",
      "no puede ser negativo",
    ].some((m) => error.message.toLowerCase().includes(m));

    if (esErrorNegocio) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    res.status(500).json({ ok: false, message: "Error al registrar la venta" });
  }
};

// ─── PATCH /api/ventas/:id/cancelar ──────────────────────────────────────────
export const cancelarVenta = async (req, res) => {
  try {
    // FIX 1: validar UUID
    if (!esUUID(req.params.id)) {
      return err(res, 400, "ID de venta no válido");
    }
    await ventasService.cancelarVenta(req.params.id);
    res.json({ ok: true, message: "Venta cancelada, stock restaurado" });
  } catch (error) {
    console.error("[cancelarVenta]", error.message);
    const esErrorNegocio = ["no encontrada", "ya está cancelada"].some(
      (m) => error.message.toLowerCase().includes(m)
    );
    if (esErrorNegocio) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    res.status(500).json({ ok: false, message: "Error al cancelar la venta" });
  }
};