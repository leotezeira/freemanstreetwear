# freemanstreetwear
Tienda online de Freeman Streetwear

## V1 Base Scaffold

Este repositorio incluye la base inicial para V1 de Freeman Store con:

- Estructura de carpetas limpia (Next.js App Router + TypeScript)
- Esquema SQL relacional para Supabase/PostgreSQL
- Rutas API base para pagos y webhooks

### Estructura

```txt
app/
	api/
		admin/bootstrap/route.ts
		payments/create-preference/route.ts
		webhooks/mercadopago/route.ts
	admin/
		content/page.tsx
		settings/page.tsx
		orders/[id]/page.tsx
		orders/page.tsx
		products/page.tsx
		layout.tsx
		page.tsx
	auth/
		login/page.tsx
		register/page.tsx
	cart/page.tsx
	checkout/page.tsx
	contacto/page.tsx
	sobre-nosotros/page.tsx
	layout.tsx
	product/[id]/page.tsx
	shop/page.tsx
	page.tsx
components/
	auth/
	layout/
	products/
lib/
	services/
		content.service.ts
		orders.service.ts
		payments.service.ts
		products.service.ts
	supabase/
		admin.ts
		client.ts
		server.ts
	validations/
		checkout.ts
		payment.ts
middleware.ts
tailwind.config.ts
postcss.config.js
supabase/schema.sql
types/
	domain.ts
```

## UI y responsive

- Tailwind CSS con enfoque mobile-first
- Header sticky con menú mobile, carrito y navegación editable
- Footer editable (email, links sociales, copyright)
- Home editable desde admin (hero, promo, newsletter)
- Grid Shop responsive: 1 columna móvil, 2 tablet, 4 desktop
- Product page, cart y checkout con layout limpio y CTAs claros

### Siguientes pasos

1. Crear proyecto Next.js con TypeScript si aún no existe.
2. Ejecutar `supabase/schema.sql` en tu proyecto Supabase.
3. Configurar variables de entorno según `.env.example`.

## Páginas V1

- Home: `/`
- Shop: `/shop`
- Sobre nosotros: `/sobre-nosotros`
- Contacto: `/contacto`

## Auth (Supabase)

- Login y Registro: `/auth`
- Admin protegido server-side por tabla `admins` en layout de `/admin`

### Cómo cargar APIs/keys de Supabase

En tu `.env.local` (basado en `.env.example`) cargá:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Crear primer admin

1. Registrá un usuario en `/auth`
2. Definí `ADMIN_BOOTSTRAP_SECRET` en `.env.local`
3. Llamá al endpoint `POST /api/admin/bootstrap` con:

```json
{
	"email": "tu-email-admin@dominio.com",
	"secret": "tu-admin-bootstrap-secret"
}
```

Después de eso, ese usuario ya puede ingresar a `/admin`.

