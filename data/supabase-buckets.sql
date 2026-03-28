-- ============================================
-- CREACIÓN DE BUCKETS DE ALMACENAMIENTO
-- ============================================
-- Ejecutar en Supabase SQL Editor

-- 1. Bucket para imágenes de productos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Bucket para imágenes de bundles/packs
INSERT INTO storage.buckets (id, name, public)
VALUES ('bundle-images', 'bundle-images', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Bucket para branding (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Políticas para product-images
CREATE POLICY "Usuarios autenticados pueden subir imágenes de productos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Usuarios autenticados pueden ver imágenes de productos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de productos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de productos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Políticas para bundle-images
CREATE POLICY "Usuarios autenticados pueden subir imágenes de bundles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bundle-images');

CREATE POLICY "Usuarios autenticados pueden ver imágenes de bundles"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bundle-images');

CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de bundles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bundle-images');

CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de bundles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bundle-images');

-- Políticas para branding
CREATE POLICY "Usuarios autenticados pueden subir imágenes de branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Usuarios autenticados pueden ver imágenes de branding"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');
