import * as service from "../services/creditos.service.js";


// ── Helpers de validación ────────────────────────────────────────────────────

const esUUIDValido = (val) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const responderError = (res, status, msg) =>
    res.status(status).json({ ok: false, message: msg });

// ── Controllers ──────────────────────────────────────────────────────────────

export const getCreditos = async (req, res) => {
    try {
        const { estado, cliente_id, page, limit } = req.query;

        // Validar estado permitido
        const estadosPermitidos = ["pendiente", "pagado", "cancelado"];
        if (estado && !estadosPermitidos.includes(estado)) {
            return responderError(res, 400, "Estado no válido");
        }

        // Validar UUID de cliente si viene
        if (cliente_id && !esUUIDValido(cliente_id)) {
            return responderError(res, 400, "cliente_id no válido");
        }

        const result = await service.getAllCreditos({
            estado,
            cliente_id,
            page: Math.max(1, parseInt(page) || 1),
            limit: Math.min(100, parseInt(limit) || 20), // máximo 100 por página
        });
        res.json({ ok: true, ...result });
    } catch (err) {
        console.error("[getCreditos]", err.message);
        res.status(500).json({ ok: false, message: "Error al obtener créditos" });
    }
};

export const getCredito = async (req, res) => {
    try {
        if (!esUUIDValido(req.params.id)) {
            return responderError(res, 400, "ID no válido");
        }
        const credito = await service.getCreditoById(req.params.id);
        if (!credito) return responderError(res, 404, "Crédito no encontrado");
        res.json({ ok: true, data: credito });
    } catch (err) {
        console.error("[getCredito]", err.message);
        res.status(500).json({ ok: false, message: "Error al obtener crédito" });
    }
};

export const createCredito = async (req, res) => {
    try {
        const { cliente_id, monto_total, venta_id } = req.body;

        // Validaciones
        if (!cliente_id || !esUUIDValido(cliente_id)) {
            return responderError(res, 400, "cliente_id requerido y debe ser válido");
        }
        if (!monto_total || isNaN(parseFloat(monto_total)) || parseFloat(monto_total) <= 0) {
            return responderError(res, 400, "monto_total debe ser un número mayor a cero");
        }
        if (venta_id && !esUUIDValido(venta_id)) {
            return responderError(res, 400, "venta_id no válido");
        }

        const credito = await service.createCredito({ cliente_id, monto_total, venta_id });
        res.status(201).json({ ok: true, data: credito });
    } catch (err) {
        console.error("[createCredito]", err.message);
        res.status(400).json({ ok: false, message: err.message });
    }
};

export const abonar = async (req, res) => {
    try {
        if (!esUUIDValido(req.params.id)) {
            return responderError(res, 400, "ID no válido");
        }

        const { monto } = req.body;
        if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
            return responderError(res, 400, "monto debe ser un número mayor a cero");
        }

        // Límite de monto por abono (medida antifraude)
        if (parseFloat(monto) > 999999) {
            return responderError(res, 400, "Monto excede el límite permitido por operación");
        }

        const result = await service.registrarAbono(req.params.id, { monto: parseFloat(monto) });
        res.json({ ok: true, data: result });
    } catch (err) {
        console.error("[abonar]", err.message);
        res.status(400).json({ ok: false, message: err.message });
    }
};

export const cancelarCredito = async (req, res) => {
    try {
        if (!esUUIDValido(req.params.id)) {
            return responderError(res, 400, "ID no válido");
        }
        const credito = await service.cancelarCredito(req.params.id);
        res.json({ ok: true, data: credito, message: "Crédito cancelado" });
    } catch (err) {
        console.error("[cancelarCredito]", err.message);
        res.status(400).json({ ok: false, message: err.message });
    }
};

export const getEstadisticas = async (req, res) => {
    try {
        const stats = await service.getEstadisticasCreditos();
        res.json({ ok: true, data: stats });
    } catch (err) {
        console.error("[getEstadisticas]", err.message);
        res.status(500).json({ ok: false, message: "Error al obtener estadísticas" });
    }
};