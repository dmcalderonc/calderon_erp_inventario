-- ============================================
-- MIGRACIÓN FASE 5: Recepción con Justificativo
-- ============================================
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase5.sql

ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS justificativo_recepcion TEXT;
