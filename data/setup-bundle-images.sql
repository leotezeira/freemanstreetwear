-- ============================================
-- CONFIGURACIÓN COMPLETA DE BUNDLE-IMAGES
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. CREAR BUCKET (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bundle-images',
  'bundle-images',
  false,  -- NO público (usamos signed URLs)
  8388608,  -- 8MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. HABILITAR RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS PARA BUNDLE-IMAGES

-- Permitir INSERT a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir imágenes de bundles" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir imágenes de bundles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bundle-images');

-- Permitir SELECT (lectura) a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver imágenes de bundles" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden ver imágenes de bundles"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bundle-images');

-- Permitir UPDATE a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar imágenes de bundles" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de bundles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bundle-images');

-- Permitir DELETE a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar imágenes de bundles" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de bundles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bundle-images');

-- 4. VERIFICAR QUE EL BUCKET EXISTE
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'bundle-images';

-- 5. VERIFICAR POLÍTICAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%bundles%';

-- ============================================
-- NOTAS:
-- 1. El bucket debe ser PRIVADO (public = false)
-- 2. Usamos signed URLs con validez de 30 días
-- 3. Solo usuarios autenticados pueden acceder
-- ============================================
