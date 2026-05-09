# Arquitectura TPV (estado actual)

## Principio clave

Evitar mezclar módulos. Cada dominio tiene su fuente de verdad y su pantalla principal.

## Dominios

- `admin/warehouses`: maestro de almacenes (alta/listado).
- `admin/inventory`: inventario operativo detallado (lote, serie, caducidad, stock).
- `admin/purchases`: compras a proveedor y recepción.

## Fuente de verdad de stock

- `inventory_items`: stock detallado por combinación `producto + almacén + lote + serie + caducidad`.
- `inventory_item_movements`: historial detallado de entradas/salidas/ajustes.
- `product_stock`: agregado por `producto + almacén` para consultas rápidas.
- `stock_movements`: bitácora agregada por producto/almacén.

`products.warehouse` se considera campo legacy de transición y no debe usarse para lógica nueva.

## Flujo de datos recomendado

1. Registrar movimiento en `admin/inventory`.
2. Actualizar `inventory_items`.
3. Registrar en `inventory_item_movements`.
4. Recalcular agregado en `product_stock`.
5. Registrar reflejo en `stock_movements`.

## Organización de código

- `src/features/inventory/*`: consultas, server-fns y tipos de inventario.
- `src/features/purchases/*`: lógica de compras.
- `src/features/admin/*`: catálogo y vistas administrativas generales.
- `src/routes/admin/*`: UI por módulo, sin mezclar reglas de dominio.

## Regla de evolución

Antes de añadir una funcionalidad nueva, definir:

- qué tabla es fuente de verdad,
- qué pantalla la opera,
- qué proyección/tabla agregada mantiene para rendimiento.
