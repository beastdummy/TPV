# The Hard Blok TPV — Guía de continuidad para Cursor

## Contexto del proyecto

Este proyecto es un TPV profesional para hostelería llamado **The Hard Blok TPV**.

Stack actual:

- TanStack Start / TanStack Router
- React + TypeScript
- TailwindCSS
- PostgreSQL
- Server Functions de TanStack Start
- Arquitectura por rutas, features y componentes

Objetivo del producto:

Crear un TPV vendible para bares, cafeterías, restaurantes y negocios de hostelería, con administración de catálogo, ventas, caja, usuarios, roles, seguridad y futura modularidad por licencias.

---

## Estado actual del proyecto

### Ya implementado

- Panel de administración base.
- CRUD de categorías:
  - crear categoría
  - editar categoría
  - borrar categoría solo si está vacía de productos
- CRUD de productos:
  - listado de productos desde PostgreSQL
  - crear producto
  - editar producto
  - borrar producto
- PostgreSQL conectado mediante `pg`.
- Separación correcta entre:
  - `queries.server.ts` para SQL y acceso a base de datos
  - `server-fns.ts` para Server Functions
  - rutas en `src/routes/admin`
- Navegación TanStack Router corregida con rutas hijas y `<Outlet />`.
- UI del panel admin con `AdminShell`.
- Vista de ventas visualmente avanzada, pero todavía con datos hardcodeados.

---

## Arquitectura importante

### Server-side

Los accesos a PostgreSQL deben vivir únicamente en:

```txt
src/lib/db.server.ts
src/features/admin/queries.server.ts
```

Nunca importar `pg`, `db.server` ni `queries.server` directamente desde componentes o rutas cliente.

### Server Functions

Las rutas y componentes deben hablar con backend mediante:

```txt
src/features/admin/server-fns.ts
```

Patrón correcto:

```ts
export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateProductInput) => data)
  .handler(async ({ data }) => {
    const { createProduct } = await import('./queries.server')
    await createProduct(data)
    return { ok: true }
  })
```

Importante: los imports a `queries.server` deben ser dinámicos dentro del handler.

### Rutas admin actuales

Estructura esperada:

```txt
src/routes/admin/
  index.tsx
  categories.tsx
  products.tsx
  products.create.tsx
  products.$productId.edit.tsx
```

`products.tsx` actúa como ruta padre de:

```txt
/admin/products/create
/admin/products/$productId/edit
```

Por eso debe usar `<Outlet />` cuando la ruta hija esté activa.

---

## Problemas detectados y prioridad

### Alta prioridad: seguridad

Actualmente el admin y las mutaciones no tienen autenticación real ni autorización.

Riesgos:

- Cualquier usuario que acceda a la app podría invocar Server Functions si conoce la ruta/acción.
- Las mutaciones de catálogo no validan sesión ni rol.
- Login y PIN son todavía rutas visuales/placeholders.

Prioridad obligatoria antes de vender:

1. Login real.
2. Sesiones seguras.
3. Roles/permisos.
4. Protección de rutas admin.
5. Protección de Server Functions.
6. Auditoría.

---

## Plan de endurecimiento recomendado

## Sprint 1 — Autenticación real

### Objetivo

Implementar login/logout real con sesión en servidor.

### Tablas recomendadas

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

### Recomendaciones

- Usar `argon2id` para contraseñas.
- Cookie HttpOnly para sesión:
  - `HttpOnly`
  - `Secure` en producción
  - `SameSite=Lax` o `Strict`
  - expiración clara
- Rotar sesión tras login.
- Logout debe revocar sesión en BD y limpiar cookie.

---

## Sprint 2 — RBAC y protección

### Roles iniciales sugeridos

```ts
type Role = 'owner' | 'admin' | 'manager' | 'cashier'
```

### Permisos mínimos

Owner:

- todo

Admin:

- administrar catálogo
- administrar usuarios
- ver reportes

Manager:

- administrar productos/categorías
- ver ventas
- abrir/cerrar caja

Cashier:

- vender
- consultar productos
- no borrar productos/categorías

### Helper recomendado

Crear helpers server-only:

```txt
src/features/auth/auth.server.ts
```

Funciones esperadas:

```ts
getCurrentUser()
requireAuth()
requireRole(['owner', 'admin'])
requirePermission('catalog:update')
```

Cada Server Function mutable debe hacer:

```ts
const user = await requireRole(['owner', 'admin', 'manager'])
```

antes de ejecutar SQL.

---

## Sprint 3 — Validación server-side

Actualmente muchas Server Functions usan:

```ts
.inputValidator((data) => data)
```

Esto no valida realmente.

Sustituir por Zod.

### Instalar

```bash
npm install zod
```

### Ejemplo

```ts
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(''),
  price: z.number().min(0),
  category_id: z.string().trim().min(1),
  image_url: z.string().trim().max(500).optional().default(''),
  tax_rate: z.number().min(0).max(100),
  warehouse: z.string().trim().min(1).max(120),
  sort_order: z.number().int().min(0),
})
```

Server Function:

```ts
export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((data) => createProductSchema.parse(data))
  .handler(async ({ data }) => {
    await requireRole(['owner', 'admin', 'manager'])

    const { createProduct } = await import('./queries.server')
    await createProduct(data)

    return { ok: true }
  })
```

---

## Sprint 4 — Auditoría y seguridad operativa

### Tabla audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Registrar eventos como:

- `auth.login.success`
- `auth.login.failed`
- `catalog.category.create`
- `catalog.category.update`
- `catalog.category.delete`
- `catalog.product.create`
- `catalog.product.update`
- `catalog.product.delete`
- `sale.create`
- `cash.close`

---

## Sprint 5 — Conectar ventas con catálogo real

Actualmente `sales.tsx` usa arrays hardcodeados.

Debe cambiar a datos reales desde PostgreSQL.

### Objetivo

- Cargar categorías activas desde BD.
- Cargar productos activos desde BD.
- Filtrar productos por categoría.
- Añadir productos al ticket desde datos reales.
- Eliminar arrays hardcodeados.

### Server Functions necesarias

Ya existen o deberían existir:

```ts
getCategoriesFn()
getProductsFn()
```

Para ventas, puede crearse una función específica:

```ts
getSalesCatalogFn()
```

que devuelva solo:

```ts
{
  categories: activeCategories,
  products: activeProducts
}
```

con datos ordenados y listos para TPV.

---

## Sprint 6 — Guardar ventas reales

Tablas sugeridas:

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_total NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);
```

Importante: guardar `product_name`, `unit_price` y `tax_rate` en `sale_items`, aunque el producto cambie después.

---

## Reglas técnicas del proyecto

### No hacer

- No importar `queries.server.ts` desde rutas o componentes.
- No importar `db.server.ts` desde UI.
- No usar `pg` en cliente.
- No confiar en validación frontend para seguridad.
- No borrar categorías con productos asociados.
- No guardar secretos en git.
- No usar arrays hardcodeados en ventas cuando ya exista BD.

### Sí hacer

- Usar Server Functions para comunicación cliente/servidor.
- Validar con Zod en servidor.
- Proteger cada mutación con sesión + rol.
- Usar SQL parametrizado.
- Auditar acciones críticas.
- Usar `router.invalidate()` tras mutaciones si se quiere refrescar loaders.
- Usar `<Outlet />` en rutas padre con rutas hijas.

---

## Pendientes inmediatos

### 1. Confirmar edición de productos

Verificar que:

```txt
/admin/products/$productId/edit
```

funciona correctamente:

- carga datos
- permite modificar
- guarda cambios
- vuelve a `/admin/products`
- la tabla refleja cambios

### 2. Sustituir alerts por notificaciones reales

Actualmente se usan:

```ts
window.alert()
window.confirm()
```

Mejorar con un sistema toast como `sonner` o shadcn toast.

### 3. Conectar ventas a catálogo real

Eliminar arrays locales en:

```txt
src/routes/sales.tsx
```

y cargar categorías/productos desde PostgreSQL.

### 4. Login seguro

Crear módulo `auth`:

```txt
src/features/auth/
  auth.server.ts
  queries.server.ts
  server-fns.ts
  types.ts
```

Rutas:

```txt
src/routes/login.tsx
src/routes/logout.tsx
```

---

## Checklist preproducto vendible

- [ ] Login real con hash de contraseña
- [ ] Sesiones HttpOnly
- [ ] Logout real
- [ ] Roles y permisos
- [ ] Admin protegido
- [ ] Server Functions protegidas
- [ ] Validación Zod
- [ ] Rate limit login
- [ ] Auditoría
- [ ] Ventas conectadas a BD
- [ ] Guardar ventas reales
- [ ] Tests mínimos
- [ ] Backups PostgreSQL
- [ ] `.env` fuera del repo
- [ ] README de instalación
- [ ] Script SQL inicial
- [ ] Migraciones
- [ ] Build de producción probado

---

## Prioridad exacta recomendada desde aquí

1. Terminar edición de productos si queda algún detalle.
2. Conectar ventas a productos reales.
3. Guardar ventas en BD.
4. Crear login real.
5. Proteger admin y server functions.
6. Validación Zod.
7. Notificaciones UX.
8. Auditoría.
9. Tests.
10. Preparar empaquetado/comercialización.

---

## Mensaje para Cursor

Actúa como ingeniero senior revisando este proyecto para convertirlo en un TPV vendible.

Prioriza:

1. Seguridad real.
2. Consistencia de datos.
3. Separación server/client.
4. PostgreSQL como fuente única de verdad.
5. Código simple, mantenible y escalable.

Antes de modificar rutas TanStack, revisar `routeTree.gen.ts` y la estructura real de `src/routes`.

No introducir librerías grandes sin justificarlo.

No romper el patrón actual:

```txt
routes -> server-fns -> queries.server -> db.server -> PostgreSQL
```

Si hay que cambiar algo estructural, explicar el motivo y hacerlo de forma incremental.
