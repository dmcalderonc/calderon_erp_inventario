-- ============================================
-- MIGRACIÓN FASE 6: Autorización de Traspasos
-- ============================================
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase6.sql

ALTER TABLE traspasos ADD COLUMN IF NOT EXISTS autorizado_por_id UUID REFERENCES users(id);
ALTER TABLE traspasos ADD COLUMN IF NOT EXISTS fecha_autorizacion TIMESTAMP;
