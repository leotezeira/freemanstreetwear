-- Migration: Agregar métodos de envío por defecto
-- Ejecutar en Supabase SQL Editor

-- Insertar métodos de envío por defecto si no existen
INSERT INTO public.site_content (key, value, updated_at)
VALUES (
  'shipping_methods',
  '[
    {
      "id": "home-standard",
      "name": "Envío a domicilio",
      "type": "D",
      "price": 7500,
      "etaDays": null,
      "enabled": true,
      "description": "Envío estándar a domicilio"
    },
    {
      "id": "branch-standard",
      "name": "Envío a sucursal",
      "type": "S",
      "price": 6500,
      "etaDays": null,
      "enabled": true,
      "description": "Retiro en sucursal de Correo Argentino"
    }
  ]'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
