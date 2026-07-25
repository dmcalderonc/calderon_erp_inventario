-- ============================================
-- MIGRACIÓN: Cantidad Original para Trazabilidad de Splits
-- ============================================
-- Ejecutar en PostgreSQL:
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase4.sql

-- ============================================
-- 1. DETALLES DE REQUERIMIENTO - Cantidad Original
-- ============================================
-- Cantidad original antes de cualquier split por aprobación parcial
ALTER TABLE detalles_requerimiento ADD COLUMN IF NOT EXISTS cantidad_original INTEGER;

-- Backfill: copiar cantidad_solicitada para registros existentes
UPDATE detalles_requerimiento SET cantidad_original = cantidad_solicitada WHERE cantidad_original IS NULL;
