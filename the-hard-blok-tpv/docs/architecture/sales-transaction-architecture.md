# Arquitectura transaccional de ventas (TPV)

Documento de diseño **previo** a implementar operaciones críticas de caja (`finalizeSale`, pagos reales, decremento de stock, etc.). Define límites, estados y estrategias para que la migración sea segura e incremental.

**Estado:** foundations only — ver scaffolding en `src/features/sales/transaction/`.

---

## 1. Contexto actual

| Capa | Estado |
|------|--------|
| UI `/sales` | Ticket en cliente (`use-ticket.ts`), catálogo vía loader tenant-aware |
| Autorización | `POS_OPERATION_ROLES` + `requirePosOperationTenantForRoute` + `requireBusinessRole` |
| Persistencia ventas | Tabla `sales` **aún no** en `db/schema.sql`; dashboard tolera ausencia (`salesTableExists`) |
| Stock | `product_stock` + `stock_movements` (+ detalle `inventory_items` en inventario) |
| Tenancy | `businesses`, `business_members`; `business_id` en dominios pendiente |

**Principio:** una venta finalizada es un **agregado transaccional** que debe persistirse de forma atómica con sus efectos colaterales (stock, pagos, sesión de caja, ticket).

---

## 2. Límites de transacción (transaction boundaries)

### 2.1 Unidad de trabajo atómica: `FinalizeSale`

Una sola transacción PostgreSQL (`BEGIN` … `COMMIT`) por intento de finalización. Todo lo siguiente entra o nada:

1. Validar contexto (usuario, negocio, sesión de caja abierta, permisos POS).
2. Comprobar idempotencia (clave cliente ya procesada → respuesta cacheada).
3. Insertar cabecera `sales` (estado inicial `pending` → `completed` al final del bloque).
4. Insertar líneas `sale_items` (snapshot de precio, impuestos, descuentos).
5. Insertar `sale_payments` (uno o varios métodos; Fase 1 puede ser un solo pago simulado).
6. Decrementar stock (movimientos `out` en `product_stock` / `stock_movements`; política de detalle en §3).
7. Actualizar proyecciones de ticket / número de ticket (si aplica en la misma TX).
8. Registrar fila en `sale_idempotency_keys` (o equivalente) con resultado.

**Fuera** del boundary atómico inicial (fases posteriores):

- Impresión física / PDF (reintento asíncrono).
- Sincronización WebSocket / offline queue.
- Envío a pasarela de pago externa (patrón saga: reservar → capturar → confirmar venta).

### 2.2 Qué NO mezclar en la misma TX

- Apertura/cierre de turno de caja global (operaciones de sesión con otras ventas concurrentes).
- Recálculos de dashboard o informes.
- Mutaciones de catálogo (productos/categorías).

### 2.3 Capas de código (objetivo)

```
routes/sales.tsx          → UI + llamadas RPC
sales.server-fns.ts       → RPC tenant-aware (fase write)
sales-write-access.server → autorización + orquestación
sales/commands/           → finalize-sale.command.ts (único entry de escritura crítica)
sales/queries.server.ts   → lecturas
inventory/queries.server  → decremento reutilizando cliente TX existente
```

El comando `finalizeSale` **no existe aún**; el orden de pasos está fijado en `SALES_FINALIZE_BOUNDARY` (`transaction/boundaries.ts`).

---

## 3. Flujo de decremento de stock

### 3.1 Fuente de verdad (alineado con `docs/architecture-tpv.md`)

- **Agregado operativo POS:** `product_stock` por `(product_id, warehouse_id)`.
- **Bitácora:** `stock_movements` con `movement_type = 'out'`.
- **Detalle lote/serie:** `inventory_items` solo si el producto exige trazabilidad; Fase 1 puede usar almacén POS por defecto sin FIFO automático.

### 3.2 Secuencia dentro de `FinalizeSale`

```
FOR EACH sale_line:
  1. Resolver warehouse_id (config negocio / terminal / producto default)
  2. SELECT quantity FROM product_stock WHERE ... FOR UPDATE  -- bloqueo fila
  3. Si quantity < line.qty → ROLLBACK + SALES_TX_INSUFFICIENT_STOCK
  4. Actualizar product_stock (nueva cantidad)
  5. INSERT stock_movements (reason: 'Venta {sale_id}', performed_by_user_id)
  6. (Opcional Fase 2) Descontar inventory_items con política FIFO/FEFO
```

Reutilizar el patrón de `createStockMovement` / `createPurchaseReceipt` (misma conexión `PoolClient`, sin commits intermedios).

### 3.3 Compensación

- **Void / anulación** (futuro): transacción inversa (`movement_type = 'in'`) ligada a `sale_id`, solo si la venta está `completed` y la sesión de caja lo permite.
- No borrar filas de `sales`; usar estados terminales (`cancelled`, `refunded`).

---

## 4. Ciclo de vida del ticket / recibo

### 4.1 Ticket cliente (UI)

| Fase | Dónde | Descripción |
|------|--------|-------------|
| `draft` | Cliente (`use-ticket`) | Líneas mutables, sin `sale_id` |
| `submitting` | Cliente | Esperando RPC `finalizeSale` |
| `committed` | Cliente + servidor | `sale_id` devuelto; ticket limpiado o archivado localmente |
| `failed` | Cliente | Error recuperable; ticket conservado para reintento |

### 4.2 Registro servidor (`sales` + proyección ticket)

| Estado `sales.status` | Significado |
|----------------------|-------------|
| `pending` | Creado dentro de TX, aún no confirmado (uso interno corto) |
| `completed` | Venta cerrada; stock y pagos aplicados |
| `cancelled` | Anulada antes de cierre o void administrativo |
| `refunded` | Devolución parcial/total (futuro) |

**Número de ticket:** columna `ticket_number` (secuencia por `business_id` + opcional `terminal_id`). Generar dentro de la TX con `INSERT ... ON CONFLICT` o secuencia dedicada `sale_ticket_seq`.

**Recibo impreso/PDF:** tabla opcional `sale_receipts` (`sale_id`, `format`, `payload_json`, `printed_at`) — proyección **después** del commit, reintentable.

---

## 5. Ciclo de vida de sesión de caja (`cash_sessions`)

| Estado | Transiciones |
|--------|----------------|
| `open` | Apertura por cajero (`opened_by_user_id`, fondo inicial) |
| `closing` | Cierre iniciado; no nuevas ventas |
| `closed` | Arqueo confirmado; totales consolidados |
| `suspended` | Pausa excepcional (solo manager+) |

Reglas:

- Toda venta `completed` referencia `cash_session_id` obligatorio.
- `FinalizeSale` rechaza si no hay sesión `open` para `(business_id, terminal_id)`.
- Cierre de sesión: TX separada que valida que no queden ventas `pending` y compara totales esperados vs `sale_payments`.

---

## 6. Fallos y rollback

| Escenario | Comportamiento |
|-----------|----------------|
| Error SQL / stock insuficiente | `ROLLBACK` completo; cliente recibe código estable (`SALES_TX_*`) |
| Timeout cliente | Reintento con **misma** `idempotency_key` → misma respuesta sin doble stock |
| Error post-commit (impresora) | Venta ya `completed`; cola de reimpresión, sin tocar stock |
| Pago externo fallido (futuro) | Saga: venta en `payment_pending` hasta captura; no decrementar stock hasta `payment_captured` (decisión de fase) |

**Fase MVP recomendada:** pago registrado como fila interna (`payment_method` cash/card) sin pasarela; stock y venta en la misma TX.

Mapeo de errores: `src/features/sales/transaction/errors.ts`.

---

## 7. Idempotencia

### 7.1 Clave

Formato: `sale:{businessId}:finalize:{clientRequestId}`

- `clientRequestId`: UUID generado al pulsar "Cobrar" (una vez por intento lógico).
- Persistir en `sale_idempotency_keys (business_id, key, sale_id, response_hash, created_at)` con TTL opcional de limpieza.

### 7.2 Flujo

```
1. BEGIN
2. INSERT idempotency_key ... ON CONFLICT DO NOTHING RETURNING sale_id
3. Si conflicto → SELECT sale_id + payload cacheado → COMMIT (no-op) → return
4. Si nuevo → ejecutar boundary completo → guardar resultado en fila idempotency
5. COMMIT
```

Helpers: `buildSaleIdempotencyKey`, `parseSaleIdempotencyKey` en `transaction/idempotency.ts`.

---

## 8. Concurrencia y condiciones de carrera

| Riesgo | Mitigación |
|--------|------------|
| Dos cajeros venden el último unit | `SELECT ... FOR UPDATE` en `product_stock` dentro de la TX |
| Doble clic "Cobrar" | `clientRequestId` + idempotency |
| Dos terminales, misma sesión | `terminal_id` en sesión; opcional bloqueo advisory `pg_advisory_xact_lock` por sesión |
| Secuencia ticket duplicada | Secuencia DB por `(business_id)` o `UNIQUE (business_id, ticket_number)` |
| Lectura catálogo stale | Precios **snapshot** en `sale_items` al finalizar, no confiar en precio vivo |

**Nivel de aislamiento:** `READ COMMITTED` suficiente si siempre se usa `FOR UPDATE` en stock; evaluar `SERIALIZABLE` solo si aparecen anomalías en pruebas de carga.

---

## 9. Implicaciones futuras de `business_id`

Hoy el dashboard ya filtra `s.business_id` cuando existe. Plan de aislamiento:

| Tabla | Columna | Índice |
|-------|---------|--------|
| `sales` | `business_id NOT NULL` | `(business_id, created_at)` |
| `sale_items` | vía `sale_id` | — |
| `sale_payments` | vía `sale_id` | — |
| `cash_sessions` | `business_id` | `(business_id, status)` |
| `stock_movements` | `business_id` (futuro) | evitar leaks cross-tenant |

**Reglas de aplicación:**

- Toda query de escritura recibe `businessId` desde `requireBusinessRole` / `requireTenantContext`, nunca del body del cliente sin validar.
- RLS (Fase multisede): `USING (business_id = current_setting('app.business_id')::uuid)`.

Migración: backfill con negocio default (`DEFAULT_BUSINESS_SLUG`) igual que tenancy foundations.

---

## 10. Modelo de datos propuesto (referencia)

No aplicar aún en `schema.sql` sin migración dedicada.

```sql
-- Esquema orientativo (simplificado)
sales (
  id UUID PK,
  business_id UUID NOT NULL REFERENCES businesses(id),
  cash_session_id UUID NOT NULL,
  terminal_id TEXT,
  ticket_number BIGINT NOT NULL,
  status TEXT NOT NULL, -- pending|completed|cancelled|refunded
  subtotal NUMERIC, tax_total NUMERIC, discount_total NUMERIC, total NUMERIC,
  payment_method TEXT, -- agregado MVP; normalizar a sale_payments después
  created_by_user_id UUID NOT NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE (business_id, idempotency_key)
);

sale_items (
  id UUID PK,
  sale_id UUID REFERENCES sales(id),
  product_id TEXT,
  product_name TEXT, -- snapshot
  quantity NUMERIC,
  unit_price NUMERIC,
  discount_percent NUMERIC,
  line_total NUMERIC
);

sale_payments (futuro inmediato post-MVP);
cash_sessions (...);
sale_idempotency_keys (...);
```

Compatible con consultas existentes en `dashboard/queries.server.ts` (`status`, `payment_method`, `total`, `business_id`).

---

## 11. Fases de implementación sugeridas

| Fase | Entregable | Riesgo |
|------|------------|--------|
| A | Migración SQL + tipos | Bajo |
| B | `cash_sessions` open/close (sin ventas) | Medio |
| C | `finalizeSale` + idempotency + stock `product_stock` only | **Alto** |
| D | Pagos reales / multipago | Alto |
| E | `inventory_items` FIFO, refunds, offline | Alto |

**No iniciar Fase C** hasta tests de integración con TX + idempotency + `FOR UPDATE`.

---

## 12. Referencias en el repo

- Patrón TX compras: `src/features/purchases/queries.server.ts` → `createPurchaseReceipt`
- Patrón TX stock: `src/features/inventory/queries.server.ts` → `createStockMovement`
- Guards POS: `src/features/sales/sales-access.server.ts`, `requirePosOperationTenantForRoute`
- Scaffolding: `src/features/sales/transaction/*`
