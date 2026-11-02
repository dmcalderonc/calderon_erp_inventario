-- Migración fase 7 — índices para la previsión de stock (Idea 3).
-- Archivo manual (synchronize: false, sin runner de migraciones).
-- Solo crea índices de forma idempotente: no toca tablas ni columnas.

-- Ventana móvil por fecha + estado PROCESADO.
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha_estado
  ON movimientos_inventario (fecha, estado);

-- Filtro por tipo de movimiento (EGRESO / TRANSFERENCIA).
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha
  ON movimientos_inventario (tipo, fecha);

-- Join detalles_movimiento → movimientos_inventario y agregación por material.
CREATE INDEX IF NOT EXISTS idx_detalles_material
  ON detalles_movimiento (material_id);

-- Agregación de stock actual por material.
CREATE INDEX IF NOT EXISTS idx_stock_bodega_material
  ON stock_bodega (material_id);
