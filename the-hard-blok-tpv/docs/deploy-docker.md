# Despliegue con Docker (TPV + Postgres)

Este proyecto puede ejecutarse completo con Docker Compose:

- `app`: TPV (TanStack Start/Nitro) en el puerto `3000`
- `postgres`: base de datos en el puerto `5432`

## 1) Requisitos

- Docker Desktop instalado
- Archivo `.env` en la raíz (puedes partir de `.env.example`)

Variables mínimas:

- `DATABASE_URL` (si no se define, compose usa por defecto `postgres://postgres:postgres@postgres:5432/the_hard_blok_tpv`)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (ej: `http://localhost:3000` en local)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 2) Levantar el stack

```bash
docker compose up -d --build
```

Ver logs de la app:

```bash
docker compose logs -f app
```

Parar servicios:

```bash
docker compose down
```

Parar y borrar volumen de datos:

```bash
docker compose down -v
```

## 3) Inicializar base de datos

Con los contenedores levantados, aplica esquema y migraciones:

```bash
docker compose exec app npm run db:schema
docker compose exec app npm run db:auth-migrate
```

Opcional (usuario admin de emergencia):

```bash
docker compose exec app npm run db:seed
```

## 4) Comprobación

- App: [http://localhost:3000](http://localhost:3000)
- DB: `localhost:5432` (usuario `postgres`, pass `postgres`, db `the_hard_blok_tpv`)

## 5) Producción

- Cambia credenciales de Postgres (no usar `postgres/postgres`).
- Usa `BETTER_AUTH_URL` con el dominio real y configura callback OAuth de Google.
- No publiques `.env`; gestiona secretos en tu plataforma (VPS, Swarm, Kubernetes, etc.).
