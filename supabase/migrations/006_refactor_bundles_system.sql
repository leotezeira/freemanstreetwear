-- =====================================================
-- MIGRACIÓN: Refactorización completa del sistema de bundles
-- =====================================================
-- Esta migración:
-- 1. Crea/actualiza la tabla bundles con todos los campos necesarios
-- 2. Crea/actualiza la tabla bundle_items
-- 3. Crea/actualiza la tabla bundle_images
-- 4. Configura RLS (Row Level Security)
-- 5. Agrega índices para mejor performance
-- =====================================================

-- =====================================================
-- 1. TABLA BUNDLES
-- =====================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT false,
  image_path TEXT,
  required_quantity INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar columna required_quantity si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bundles' AND column_name = 'required_quantity') THEN
    ALTER TABLE bundles ADD COLUMN required_quantity INTEGER NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Agregar columna updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bundles' AND column_name = 'updated_at') THEN
    ALTER TABLE bundles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Índice para slug
CREATE INDEX IF NOT EXISTS idx_bundles_slug ON bundles(slug);

-- Índice para is_active
CREATE INDEX IF NOT EXISTS idx_bundles_is_active ON bundles(is_active);

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_bundles_created_at ON bundles(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bundles_updated_at ON bundles;
CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TABLA BUNDLE_ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, product_id, variant_id)
);

-- Índices para bundle_items
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_product_id ON bundle_items(product_id);

-- =====================================================
-- 3. TABLA BUNDLE_IMAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS bundle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, image_path)
);

-- Índice para bundle_images
CREATE INDEX IF NOT EXISTS idx_bundle_images_bundle_id ON bundle_images(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_images_is_primary ON bundle_images(is_primary);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_images ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA BUNDLES
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "bundles_select_admin" ON bundles;
DROP POLICY IF EXISTS "bundles_all_admin" ON bundles;
DROP POLICY IF EXISTS "bundles_public_read" ON bundles;

-- Política: Admins pueden hacer todo
CREATE POLICY "bundles_all_admin" ON bundles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Público puede leer bundles activos
CREATE POLICY "bundles_public_read" ON bundles
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- =====================================================
-- POLÍTICAS PARA BUNDLE_ITEMS
-- =====================================================

DROP POLICY IF EXISTS "bundle_items_select_admin" ON bundle_items;
DROP POLICY IF EXISTS "bundle_items_all_admin" ON bundle_items;
DROP POLICY IF EXISTS "bundle_items_public_read" ON bundle_items;

-- Política: Admins pueden hacer todo
CREATE POLICY "bundle_items_all_admin" ON bundle_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Público puede leer bundle_items de bundles activos
CREATE POLICY "bundle_items_public_read" ON bundle_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bundles 
      WHERE bundles.id = bundle_items.bundle_id 
      AND bundles.is_active = true
    )
  );

-- =====================================================
-- POLÍTICAS PARA BUNDLE_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "bundle_images_select_admin" ON bundle_images;
DROP POLICY IF EXISTS "bundle_images_all_admin" ON bundle_images;
DROP POLICY IF EXISTS "bundle_images_public_read" ON bundle_images;

-- Política: Admins pueden hacer todo
CREATE POLICY "bundle_images_all_admin" ON bundle_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Público puede leer bundle_images de bundles activos
CREATE POLICY "bundle_images_public_read" ON bundle_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bundles 
      WHERE bundles.id = bundle_images.bundle_id 
      AND bundles.is_active = true
    )
  );

-- =====================================================
-- 5. COMENTARIOS
-- =====================================================

COMMENT ON TABLE bundles IS 'Bundles/Packs de productos con precio especial';
COMMENT ON COLUMN bundles.required_quantity IS 'Cantidad de productos que el cliente debe elegir';
COMMENT ON TABLE bundle_items IS 'Productos que forman parte de un bundle';
COMMENT ON TABLE bundle_images IS 'Imágenes de bundles con orden y primaria';

-- =====================================================
-- 6. FUNCIÓN HELPER: Generar slug automático
-- =====================================================

CREATE OR REPLACE FUNCTION generate_bundle_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Normalizar y limpiar
  base_slug := LOWER(
    REGEXP_REPLACE(
      UNACCENT(name),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');
  
  -- Verificar unicidad
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM bundles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
