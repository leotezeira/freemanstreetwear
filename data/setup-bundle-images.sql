-- ============================================
-- CONFIGURACIÓN DE BUCKET BUNDLE-IMAGES
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. CREAR BUCKET (si no existe)
-- Nota: Los buckets también se pueden crear desde el Dashboard → Storage
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

-- ============================================
-- POLÍTICAS DE STORAGE (desde Dashboard)
-- ============================================
-- Las políticas de storage NO se pueden crear vía SQL directamente
-- porque requieren ser owner de storage.objects.
--
-- SEGUÍ ESTOS PASOS MANUALES:
--
-- 1. Ir a: https://app.supabase.com/project/YOUR_PROJECT/storage
-- 2. Click en el bucket "bundle-images"
-- 3. Click en "Policies" (pestaña superior)
-- 4. Click en "New Policy"
-- 5. Seleccionar "For full customization"
-- 6. Crear las siguientes 4 políticas:
--
-- POLÍTICA 1 - INSERT (subir imágenes):
-- Policy name: Usuarios autenticados pueden subir imágenes
-- Action: INSERT
-- Target: all
-- Definition: (bucket_id = 'bundle-images')
--
-- POLÍTICA 2 - SELECT (ver imágenes):
-- Policy name: Usuarios autenticados pueden ver imágenes
-- Action: SELECT
-- Target: all
-- Definition: (bucket_id = 'bundle-images')
--
-- POLÍTICA 3 - UPDATE (actualizar imágenes):
-- Policy name: Usuarios autenticados pueden actualizar imágenes
-- Action: UPDATE
-- Target: all
-- Definition: (bucket_id = 'bundle-images')
--
-- POLÍTICA 4 - DELETE (eliminar imágenes):
-- Policy name: Usuarios autenticados pueden eliminar imágenes
-- Action: DELETE
-- Target: all
-- Definition: (bucket_id = 'bundle-images')
-- ============================================

-- 2. VERIFICAR QUE EL BUCKET EXISTE
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'bundle-images';

-- ============================================
-- ALTERNATIVA: CREAR BUCKET DESDE EL DASHBOARD
-- ============================================
-- 1. Ir a Storage en Supabase Dashboard
-- 2. Click "Create bucket"
-- 3. Nombre: bundle-images
-- 4. Public: OFF (privado)
-- 5. File size limit: 8388608 (8MB)
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp
-- 7. Click "Create bucket"
-- ============================================
