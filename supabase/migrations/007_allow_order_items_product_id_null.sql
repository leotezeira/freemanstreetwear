-- Migration: Permitir que order_items.product_id sea nullable y usar ON DELETE SET NULL
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.order_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE SET NULL;
