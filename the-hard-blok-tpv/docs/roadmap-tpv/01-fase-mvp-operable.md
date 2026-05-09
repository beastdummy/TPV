# Fase 1 - MVP Operable

## Objetivo

Poner el TPV en funcionamiento real con estabilidad operativa basica.

## Alcance funcional

- Ventas con catalogo real (categorias y productos activos).
- Login con roles base (`owner`, `admin`, `manager`, `cashier`).
- Acciones sensibles protegidas en servidor.
- Apertura/cierre de caja por turno.
- Tickets basicos (emision y reimpresion).

## Alcance tecnico

- Docker Compose estable (`app + postgres`).
- Variables de entorno separadas por entorno.
- Backups diarios de Postgres.
- Logs de aplicacion y errores de servidor.

## Criterios de salida

- El negocio puede vender una jornada completa sin bloqueos.
- Hay cierre de caja y trazabilidad minima por usuario.
- El restore de backup se ha probado al menos una vez.
