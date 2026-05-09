# Fase 2 - Operacion Pro

## Objetivo

Cubrir operativa de negocio avanzada y control interno.

## Modulos prioritarios

- Almacenes y stock por producto.
- Compras a proveedor (pedido, recepcion, regularizacion).
- Gestion de mesas y flujo de comandas.
- Impresoras (ticket, cocina, barra) con plantillas.
- Configuracion de empresa (datos fiscales, series, impuestos).

## Criterio de arquitectura (obligatorio)

- Almacenes (`admin/warehouses`) solo como maestro de ubicaciones.
- Inventario (`admin/inventory`) como unica operativa de stock detallado (lote/serie/caducidad).
- No introducir logica nueva apoyada en campos legacy.
- Ver `docs/architecture-tpv.md`.

## Seguridad y control

- Auditoria completa de acciones (quien, que, cuando, antes/despues).
- Permisos granulares por accion (RBAC fino, no solo rol global).
- Politicas de sesion y cierre automatico por inactividad.

## Criterios de salida

- Se controla inventario y compras sin hojas externas.
- Cada accion relevante queda auditada.
- La operativa de sala/mesas es usable en produccion.
