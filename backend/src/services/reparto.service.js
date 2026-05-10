import { pool } from "../config/db.js";

// ─── RUTAS ───────────────────────────────────────────────────────────────────

export const getAllRutas = async ({ estado, piloto, fecha_inicio, fecha_fin, page = 1, limit = 20 }) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (estado) { conditions.push(`estado = $${idx++}`); values.push(estado); }
    if (piloto) { conditions.push(`piloto ILIKE $${idx++}`); values.push(`%${piloto}%`); }
    if (fecha_inicio) { conditions.push(`fecha::date >= $${idx++}`); values.push(fecha_inicio); }
    if (fecha_fin) { conditions.push(`fecha::date <= $${idx++}`); values.push(fecha_fin); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    // FIX 1: Evitar ambigüedad de "fecha" — seleccionar columnas explícitamente
    // y renombrar el TO_CHAR para no colisionar con la columna original
    const { rows } = await pool.query(
        `SELECT
            id, folio, piloto, camion, zona_ruta,
            hora_salida, hora_regreso,
            total_garrafones_salida, total_otros_salida,
            efectivo_esperado, efectivo_entregado,
            diferencia_efectivo, diferencia_garrafones,
            estado, observaciones, notas_regreso,
            TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
         FROM rutas
         ${where}
         ORDER BY fecha DESC, hora_salida DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset]
    );

    const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM rutas ${where}`,
        values
    );

    return { data: rows, total: parseInt(countRows[0].count), page, limit };
};

export const getRutaById = async (id) => {
    const { rows } = await pool.query(
        `SELECT
            id, folio, piloto, camion, zona_ruta,
            hora_salida, hora_regreso,
            total_garrafones_salida, total_otros_salida,
            efectivo_esperado, efectivo_entregado,
            diferencia_efectivo, diferencia_garrafones,
            estado, observaciones, notas_regreso,
            TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
         FROM rutas
         WHERE id = $1`,
        [id]
    );
    if (!rows[0]) return null;

    const { rows: detalle } = await pool.query(
        `SELECT rd.*,
            pr.nombre AS producto_nombre,
            pr.unidad
         FROM ruta_detalle rd
         LEFT JOIN productos pr ON pr.id = rd.producto_id
         WHERE rd.ruta_id = $1`,
        [id]
    );

    return { ...rows[0], detalle };
};

export const createRuta = async ({
    fecha, piloto, camion, zona_ruta, hora_salida,
    estado = "en_ruta", observaciones, detalle = []
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Folio automático: RUTA-YYYYMM-XXXX
        const { rows: folioRows } = await client.query(
            `SELECT COUNT(*) FROM rutas
             WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)`
        );
        const consecutive = String(parseInt(folioRows[0].count) + 1).padStart(4, "0");
        const now = new Date();
        const folio = `RUTA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${consecutive}`;

        // FIX 2: usar nombre real de columna "total_garrafones_salida"
        const total_garrafones_salida = detalle.reduce((s, i) => s + (i.cantidad_salida || 0), 0);
        const total_otros_salida = 0;

        const { rows } = await client.query(
            `INSERT INTO rutas
               (folio, fecha, piloto, camion, zona_ruta, hora_salida,
                total_garrafones_salida, total_otros_salida, estado, observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [folio, fecha, piloto, camion, zona_ruta, hora_salida,
                total_garrafones_salida, total_otros_salida, estado, observaciones]
        );

        const ruta = rows[0];

        for (const item of detalle) {
            await client.query(
                `INSERT INTO ruta_detalle (ruta_id, producto_id, cantidad_salida, cantidad_vendida, cantidad_devuelta)
                 VALUES ($1, $2, $3, 0, 0)`,
                [ruta.id, item.producto_id, item.cantidad_salida]
            );

            await client.query(
                `UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2`,
                [item.cantidad_salida, item.producto_id]
            );

            const { rows: stockRows } = await client.query(
                `SELECT stock_actual FROM productos WHERE id = $1`, [item.producto_id]
            );
            const stockNuevo = stockRows[0]?.stock_actual || 0;

            await client.query(
                `INSERT INTO movimientos_inventario
                 (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
                 VALUES ($1, 'salida', $2, $3, $4, $5, NOW())`,
                [item.producto_id, item.cantidad_salida,
                stockNuevo + item.cantidad_salida, stockNuevo,
                `Salida ruta ${folio}`]
            );
        }

        await client.query("COMMIT");
        return ruta;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const cerrarRuta = async (id, {
    hora_regreso,
    efectivo_entregado,
    notas_regreso,
    detalle
}) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const { rows: rutaRows } = await client.query(
            `SELECT * FROM rutas WHERE id = $1`,
            [id]
        );

        if (!rutaRows[0]) {
            throw new Error("Ruta no encontrada");
        }

        const ruta = rutaRows[0];

        if (ruta.estado === "cerrada") {
            throw new Error("La ruta ya fue cerrada");
        }

        let efectivo_esperado = 0;
        let diferencia_garrafones = 0;

        // =========================================
        // RECORRER PRODUCTOS DE LA RUTA
        // =========================================
        for (const item of detalle) {

            const cantidad_salida =
                item.cantidad_salida || 0;

            const cantidad_vendida =
                item.cantidad_vendida || 0;

            const cantidad_devuelta =
                item.cantidad_devuelta || 0;

            // Diferencia real
            const diferencia_item =
                cantidad_salida -
                cantidad_vendida -
                cantidad_devuelta;

            // Actualizar detalle de ruta
            await client.query(
                `UPDATE ruta_detalle
                 SET cantidad_vendida = $1,
                     cantidad_devuelta = $2
                 WHERE ruta_id = $3
                 AND producto_id = $4`,
                [
                    cantidad_vendida,
                    cantidad_devuelta,
                    id,
                    item.producto_id
                ]
            );

            // =========================================
            // DEVOLVER STOCK SI REGRESÓ PRODUCTO
            // =========================================
            if (cantidad_devuelta > 0) {

                const { rows: stockRows } = await client.query(
                    `SELECT stock_actual
                     FROM productos
                     WHERE id = $1`,
                    [item.producto_id]
                );

                const stockAnterior =
                    stockRows[0]?.stock_actual || 0;

                const stockNuevo =
                    stockAnterior + cantidad_devuelta;

                await client.query(
                    `UPDATE productos
                     SET stock_actual = stock_actual + $1
                     WHERE id = $2`,
                    [
                        cantidad_devuelta,
                        item.producto_id
                    ]
                );

                await client.query(
                    `INSERT INTO movimientos_inventario
                    (
                        producto_id,
                        tipo_movimiento,
                        cantidad,
                        stock_anterior,
                        stock_nuevo,
                        motivo,
                        fecha
                    )
                    VALUES
                    (
                        $1,
                        'entrada',
                        $2,
                        $3,
                        $4,
                        $5,
                        NOW()
                    )`,
                    [
                        item.producto_id,
                        cantidad_devuelta,
                        stockAnterior,
                        stockNuevo,
                        `Devolución ruta ${ruta.folio}`
                    ]
                );
            }

            // =========================================
            // OBTENER PRECIO PRODUCTO
            // =========================================
            const { rows: prodRows } = await client.query(
                `SELECT precio_venta
                 FROM productos
                 WHERE id = $1`,
                [item.producto_id]
            );

            const precioVenta =
                parseFloat(prodRows[0]?.precio_venta) || 0;

            // Efectivo esperado
            efectivo_esperado +=
                precioVenta * cantidad_vendida;

            // Diferencia total
            diferencia_garrafones += diferencia_item;
        }

        // =========================================
        // DIFERENCIA EFECTIVO
        // =========================================
        const diferencia_efectivo =
            parseFloat(efectivo_entregado || 0) -
            efectivo_esperado;

        // =========================================
        // CERRAR RUTA
        // =========================================
        const { rows } = await client.query(
            `UPDATE rutas
             SET
                hora_regreso = $1,
                efectivo_esperado = $2,
                efectivo_entregado = $3,
                diferencia_efectivo = $4,
                diferencia_garrafones = $5,
                notas_regreso = $6,
                estado = 'cerrada'
             WHERE id = $7
             RETURNING *`,
            [
                hora_regreso,
                efectivo_esperado,
                efectivo_entregado,
                diferencia_efectivo,
                diferencia_garrafones,
                notas_regreso,
                id
            ]
        );

        // =========================================
        // CREAR VENTA AUTOMÁTICA DE RUTA
        // =========================================

        const itemsVenta = [];

        for (const item of detalle) {

            const cantidadVendida =
                item.cantidad_vendida || 0;

            // Solo agregar si vendió
            if (cantidadVendida <= 0) continue;

            const { rows: prodRows } = await client.query(
                `SELECT nombre, precio_venta
                 FROM productos
                 WHERE id = $1`,
                [item.producto_id]
            );

            const producto = prodRows[0];

            if (!producto) continue;

            itemsVenta.push({
                producto_id: item.producto_id,
                cantidad: cantidadVendida,
                precio: parseFloat(producto.precio_venta || 0),
                subtotal:
                    cantidadVendida *
                    parseFloat(producto.precio_venta || 0)
            });
        }

        // =========================================
        // INSERTAR VENTA SOLO SI HUBO VENTAS
        // =========================================
        if (itemsVenta.length > 0) {

            const subtotalVenta =
                itemsVenta.reduce(
                    (acc, item) => acc + item.subtotal,
                    0
                );

            const folioVenta =
                `VR-${Date.now()}`;

            // Crear venta
            const ventaRes = await client.query(
                `INSERT INTO ventas
                (
                    folio,
                    cliente_id,
                    fecha,
                    subtotal,
                    descuento,
                    total,
                    metodo_pago,
                    tipo_venta,
                    estado,
                    ruta_id,
                    notas
                )
                VALUES
                (
                    $1,
                    NULL,
                    CURRENT_DATE,
                    $2,
                    0,
                    $3,
                    'efectivo',
                    'ruta',
                    'pagada',
                    $4,
                    $5
                )
                RETURNING *`,
                [
                    folioVenta,
                    subtotalVenta,
                    subtotalVenta,
                    id,
                    `Venta automática generada desde ruta ${ruta.folio}`
                ]
            );

            const venta = ventaRes.rows[0];

            // Insertar detalle venta
            for (const item of itemsVenta) {

                await client.query(
                    `INSERT INTO venta_detalle
                    (
                        venta_id,
                        producto_id,
                        cantidad,
                        precio_unitario,
                        subtotal
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )`,
                    [
                        venta.id,
                        item.producto_id,
                        item.cantidad,
                        item.precio,
                        item.subtotal
                    ]
                );
            }
        }

        // =========================================
        // FINALIZAR
        // =========================================
        await client.query("COMMIT");

        return rows[0];

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }
};

export const updateRuta = async (id, campos) => {
    const { piloto, camion, zona_ruta, hora_salida, estado, observaciones } = campos;
    const { rows } = await pool.query(
        `UPDATE rutas SET
           piloto        = COALESCE($1, piloto),
           camion        = COALESCE($2, camion),
           zona_ruta     = COALESCE($3, zona_ruta),
           hora_salida   = COALESCE($4, hora_salida),
           estado        = COALESCE($5, estado),
           observaciones = COALESCE($6, observaciones)
         WHERE id = $7
         RETURNING *`,
        [piloto ?? null, camion ?? null, zona_ruta ?? null,
        hora_salida ?? null, estado ?? null, observaciones ?? null, id]
    );
    return rows[0];
};

export const deleteRuta = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM ruta_detalle WHERE ruta_id = $1`, [id]);
        const { rows } = await client.query(`DELETE FROM rutas WHERE id = $1 RETURNING *`, [id]);
        await client.query("COMMIT");
        return rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

// ─── ESTADÍSTICAS ────────────────────────────────────────────────────────────

export const getEstadisticasReparto = async () => {
    // FIX 2: usar nombre real "total_garrafones_salida"
    const { rows } = await pool.query(`
        SELECT
            COUNT(*)                                                                                        AS total_rutas,
            COALESCE(SUM(CASE WHEN estado = 'en_ruta'   THEN 1 ELSE 0 END), 0)                            AS en_ruta,
            COALESCE(SUM(CASE WHEN estado = 'cerrada'   THEN 1 ELSE 0 END), 0)                            AS cerradas,
            COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0)                            AS pendientes,
            COALESCE(SUM(total_garrafones_salida), 0)                                                      AS total_garrafones,
            COALESCE(SUM(efectivo_entregado), 0)                                                           AS efectivo_total,
            COALESCE(SUM(CASE WHEN fecha = CURRENT_DATE THEN total_garrafones_salida ELSE 0 END), 0)       AS garrafones_hoy
        FROM rutas
    `);
    return rows[0];
};