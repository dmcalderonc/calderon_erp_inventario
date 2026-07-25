-- ============================================
-- MIGRACIÓN FASE 3 CONSOLIDADA
-- Justificativo + Cotizaciones + OC Aprobación + Recepción Item-a-Item
-- ============================================
-- Ejecutar en PostgreSQL:
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase3.sql

-- ============================================
-- 1. REQUERIMIENTOS
-- ============================================
ALTER TABLE requerimientos ADD COLUMN IF NOT EXISTS justificativo TEXT;

-- ============================================
-- 2. DETALLES DE REQUERIMIENTO - Estados de item
-- ============================================
-- Agregar estados EN_COMPRAS y EN_TRASLADO al enum existente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EN_COMPRAS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'detalles_requerimiento_estadoitem_enum')) THEN
    ALTER TYPE detalles_requerimiento_estadoitem_enum ADD VALUE 'EN_COMPRAS';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EN_TRASLADO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'detalles_requerimiento_estadoitem_enum')) THEN
    ALTER TYPE detalles_requerimiento_estadoitem_enum ADD VALUE 'EN_TRASLADO';
  END IF;
END $$;

-- ============================================
-- 3. DETALLE ORDEN DE COMPRA
-- ============================================
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS "tiempoEntregaDias" INTEGER;
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS "archivoAdjuntoUrl" VARCHAR(255);
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS cantidad_recibida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE detalle_orden_compra ADD COLUMN IF NOT EXISTS requerimiento_detalle_id INTEGER;

-- FK a detalles_requerimiento (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_detalle_oc_requerimiento_detalle'
  ) THEN
    ALTER TABLE detalle_orden_compra
      ADD CONSTRAINT FK_detalle_oc_requerimiento_detalle
      FOREIGN KEY (requerimiento_detalle_id)
      REFERENCES detalles_requerimiento(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. ORDEN DE COMPRA - Estado RECIBIDA_PARCIAL
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RECIBIDA_PARCIAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ordenes_compra_estado_enum')) THEN
    ALTER TYPE ordenes_compra_estado_enum ADD VALUE 'RECIBIDA_PARCIAL';
  END IF;
END $$;

-- ============================================
-- 5. COTIZACIONES - Nuevas columnas y FK
-- ============================================
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS requerimiento_detalle_id INTEGER;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 0;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12,2) DEFAULT 0;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS tiempo_entrega_dias INTEGER;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS archivo_respaldo_url VARCHAR(255);

-- Hacer precio_ofertado_total nullable (si tiene datos existentes)
ALTER TABLE cotizaciones ALTER COLUMN precio_ofertado_total DROP NOT NULL;

-- FK a detalles_requerimiento (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_cotizacion_requerimiento_detalle'
  ) THEN
    ALTER TABLE cotizaciones
      ADD CONSTRAINT FK_cotizacion_requerimiento_detalle
      FOREIGN KEY (requerimiento_detalle_id)
      REFERENCES detalles_requerimiento(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 6. USERS - Seed de usuarios de prueba
-- ============================================
-- Solo insertar si no existen (usando email como identificador único)
INSERT INTO users (id, nombre, email, password, rol, is_active)
VALUES
  ('23a1d16f-eb3e-4020-be19-5097ad47b58c', 'Admin', 'admin@test.com', '$2b$10$hashed_password_placeholder', 'ADMIN', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Solicitante', 'solicitante@test.com', '$2b$10$hashed_password_placeholder', 'SOLICITANTE', true),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bodeguero', 'bodeguero@test.com', '$2b$10$hashed_password_placeholder', 'BODEGUERO', true),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Comprador', 'comprador@test.com', '$2b$10$hashed_password_placeholder', 'COMPRADOR', true)
ON CONFLICT (email) DO NOTHING;
