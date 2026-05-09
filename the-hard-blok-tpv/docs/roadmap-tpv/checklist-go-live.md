# Checklist Go-Live TPV

## Producto

- [ ] Roles y permisos revisados para todas las rutas y server-fn.
- [ ] Flujo de ventas completo validado.
- [ ] Caja: apertura, cierre y arqueo validados.
- [ ] Impresion de ticket/comanda validada (si aplica).

## Datos y seguridad

- [ ] Credenciales por defecto eliminadas.
- [ ] Secretos en variables de entorno (no en git).
- [ ] Backups automaticos activos.
- [ ] Restore de backup probado.
- [ ] Auditoria de acciones habilitada.

## Infraestructura

- [ ] Despliegue Docker repetible en servidor Linux.
- [ ] Base de datos no expuesta publicamente.
- [ ] Firewall y puertos minimos abiertos.
- [ ] Logs y alertas minimas activas.

## Operacion

- [ ] Procedimiento de rollback documentado.
- [ ] Manual rapido para personal de caja.
- [ ] Responsable tecnico y plan de soporte definidos.
