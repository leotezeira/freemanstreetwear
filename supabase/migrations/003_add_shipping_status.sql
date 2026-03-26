-- Migration: Agregar columna shipping_status a orders
-- Ejecutar en Supabase SQL Editor

-- Agregar columna shipping_status si no existe
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_status text DEFAULT 'pending';

-- Setear valor por defecto para ordenes existentes
UPDATE public.orders
SET shipping_status = 'pending'
WHERE shipping_status IS NULL;
