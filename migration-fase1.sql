-- ============================================
-- MIGRACIÓN FASE 1: Soft Delete + Multi-Bodega
-- ============================================
-- Ejecutar en PostgreSQL:
-- psql -U armin_erp_inventario -d db_erp_inventario -f migration-fase1.sql

-- 1. Agregar is_active a tablas de mantenimiento
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE unidades_medida ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Migrar campo 'estado' existente en proveedores a is_active
UPDATE proveedores SET is_active = estado WHERE is_active IS NULL;

-- 3. Agregar is_active a users (además del campo estado existente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE users SET is_active = estado WHERE is_active IS NULL;

-- 4. Agregar columnas de Google OAuth si no existen
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(255);

-- 5. Crear tabla user_bodegas para multi-bodega
CREATE TABLE IF NOT EXISTS user_bodegas (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "bodegaId" INTEGER NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
  UNIQUE("userId", "bodegaId")
);

-- 6. Migrar bodegas existentes de bodegaAsignadaId a user_bodegas
INSERT INTO user_bodegas ("userId", "bodegaId")
SELECT id, "bodegaAsignadaId"
FROM users
WHERE "bodegaAsignadaId" IS NOT NULL
ON CONFLICT ("userId", "bodegaId") DO NOTHING;

-- 7. Eliminar columna obsoleta bodegaAsignadaId
ALTER TABLE users DROP COLUMN IF EXISTS "bodegaAsignadaId";
