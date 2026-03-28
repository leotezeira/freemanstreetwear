-- ============================================
-- VERIFICAR IMÁGENES DE BUNDLES
-- ============================================
-- Ejecutar en Supabase SQL Editor para debuggear
-- ============================================

-- 1. VERIFICAR SI LA TABLA bundle_images EXISTE
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'bundle_images';

-- 2. VERIFICAR ESTRUCTURA DE LA TABLA
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bundle_images'
ORDER BY ordinal_position;

-- 3. VERIFICAR DATOS EN bundle_images
SELECT 
  id,
  bundle_id,
  image_path,
  sort_order,
  is_primary,
  created_at
FROM bundle_images
ORDER BY created_at DESC
LIMIT 10;

-- 4. VERIFICAR BUCKETS DE STORAGE
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'bundle-images';

-- 5. VERIFICAR ARCHIVOS EN EL BUCKET
SELECT 
  name,
  bucket_id,
  owner,
  size,
  created_at
FROM storage.objects
WHERE bucket_id = 'bundle-images'
ORDER BY created_at DESC
LIMIT 10;

-- 6. CONTAR IMÁGENES POR BUNDLE
SELECT 
  bundle_id,
  COUNT(*) as cantidad_imagenes,
  MAX(is_primary::int) as tiene_primary
FROM bundle_images
GROUP BY bundle_id
ORDER BY created_at DESC;

-- ============================================
-- SI LA TABLA bundle_images NO EXISTE:
-- ============================================
-- Ejecutar: data/create-bundle-images-table.sql
-- O crear manualmente:
/*
CREATE TABLE IF NOT EXISTS bundle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_bundle_sort_order UNIQUE (bundle_id, sort_order)
);

CREATE INDEX idx_bundle_images_bundle_id ON bundle_images(bundle_id);
CREATE INDEX idx_bundle_images_is_primary ON bundle_images(is_primary);
*/
-- ============================================
