-- ============================================
-- MIGRACIÓN FASE 3: Justificativo + Órdenes de Compra
-- ============================================
-- Ejecutar en PostgreSQL:
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase3.sql

-- 1. Agregar justificativo a requerimientos
ALTER TABLE requerimientos ADD COLUMN IF NOT EXISTS justificativo TEXT;

-- 2. Agregar tiempoEntregaDias y archivoAdjuntoUrl a detalles de OC si no existen
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS "tiempoEntregaDias" INTEGER;
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS "archivoAdjuntoUrl" VARCHAR(255);
