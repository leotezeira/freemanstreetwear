-- Migration: Agregar variantes a order_items
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas para variantes
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS color text;

-- Verificar columnas agregadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;
